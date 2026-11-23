import { deliverEmail } from "@/lib/deliver-email.server";
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "Veyro";
const SENDER_DOMAIN = "mail.veyrohealth.com";
const FROM_DOMAIN = "mail.veyrohealth.com";
const SITE_URL = "https://www.veyrohealth.com";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function enqueueClientInviteEmail(input: {
  recipientEmail: string;
  therapistName: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const template = TEMPLATES["client-invite"];
  if (!template) throw new Error("client-invite template not registered");

  const to = input.recipientEmail.trim().toLowerCase();

  // Skip if the address is on the suppression list.
  const { data: suppressed } = await supabaseAdmin
    .from("suppressed_emails")
    .select("email")
    .eq("email", to)
    .maybeSingle();
  if (suppressed) return { skipped: "suppressed" as const };

  const signupUrl = `${SITE_URL}/client/signup?email=${encodeURIComponent(to)}`;
  const templateData = { therapistName: input.therapistName ?? undefined, signupUrl };

  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function" ? template.subject(templateData) : template.subject;

  // unsubscribe token
  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", to)
    .maybeSingle();
  let unsubscribeToken = existing && !existing.used_at ? existing.token : generateToken();
  if (!existing || existing.used_at) {
    await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert(
        { token: unsubscribeToken, email: to },
        { onConflict: "email", ignoreDuplicates: true },
      );
    const { data: stored } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", to)
      .maybeSingle();
    unsubscribeToken = stored?.token ?? unsubscribeToken;
  }

  const messageId = crypto.randomUUID();
  const queuedAt = new Date().toISOString();

  const { error } = await deliverEmail(supabaseAdmin, {
    message_id: messageId,
    to,
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    sender_domain: SENDER_DOMAIN,
    subject,
    html,
    text,
    purpose: "transactional",
    label: "client-invite",
    idempotency_key: messageId,
    unsubscribe_token: unsubscribeToken,
    queued_at: queuedAt,
  });

  if (error) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "client-invite",
      recipient_email: to,
      status: "failed",
      error_message: error.message ?? "Failed to enqueue",
    });
    throw new Error(error.message ?? "Failed to enqueue invite email");
  }

  return { skipped: null };
}
