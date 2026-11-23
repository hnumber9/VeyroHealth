import { deliverEmail } from "@/lib/deliver-email.server";
import * as React from "react";
import { render } from "@react-email/components";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "Veyro";
const SENDER_DOMAIN = "mail.veyrohealth.com";
const FROM_DOMAIN = "mail.veyrohealth.com";

const inputSchema = z.object({
  fullName: z.string().min(1).max(200),
});

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getOrCreateUnsubscribeToken(email: string): Promise<string> {
  const normalized = email.toLowerCase();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing && !existing.used_at) return existing.token;
  const token = generateToken();
  await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .upsert({ token, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
  const { data: stored } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  return stored?.token ?? token;
}

export const sendTherapistSignupEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Never trust a caller-supplied address: the notification always describes
    // the authenticated account that just signed up.
    const signupEmail = (context.claims as { email?: string } | null)?.email ?? null;
    if (!signupEmail) {
      return { success: false, error: "Unauthorized" };
    }
    const template = TEMPLATES["therapist-signup"];
    if (!template) {
      console.error("[therapist-signup-email] template missing");
      return { success: false, error: "Template not configured" };
    }
    const { getAdminNotificationRecipients } = await import("@/lib/admin-recipients.server");
    const recipients = await getAdminNotificationRecipients();

    const signedUpAt = new Date().toISOString();
    const templateData = { fullName: data.fullName, email: signupEmail, signedUpAt };

    try {
      const element = React.createElement(template.component, templateData);
      const html = await render(element);
      const plainText = await render(element, { plainText: true });
      const subject =
        typeof template.subject === "function" ? template.subject(templateData) : template.subject;

      let sent = 0;
      for (const recipient of recipients) {
        const messageId = crypto.randomUUID();
        const unsubscribeToken = await getOrCreateUnsubscribeToken(recipient);

        const { error: enqueueError } = await deliverEmail(supabaseAdmin, {
          message_id: messageId,
          to: recipient,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          reply_to: signupEmail,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: plainText,
          purpose: "transactional",
          label: "therapist-signup",
          idempotency_key: messageId,
          unsubscribe_token: unsubscribeToken,
          queued_at: signedUpAt,
        });

        if (enqueueError) {
          console.error("[therapist-signup-email] enqueue failed", enqueueError);
          await supabaseAdmin.from("email_send_log").insert({
            message_id: messageId,
            template_name: "therapist-signup",
            recipient_email: recipient,
            status: "failed",
            error_message: enqueueError.message ?? "Failed to enqueue email",
          });
        } else {
          sent += 1;
        }
      }

      if (!sent) return { success: false, error: "Failed to enqueue email" };
      return { success: true };
    } catch (err) {
      console.error("[therapist-signup-email] unexpected error", err);
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });
