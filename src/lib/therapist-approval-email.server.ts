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

/**
 * Best-effort "your profile is approved" email. Never throws — approval must
 * succeed even if the mail queue is unavailable.
 */
export async function sendTherapistApprovedEmail(profile: {
  user_id: string;
  display_name: string | null;
  slug: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    const therapistEmail = userRes?.user?.email ?? null;
    const template = TEMPLATES["therapist-approved"];
    if (!therapistEmail || !template) return;

    const templateData = {
      fullName: profile.display_name?.split(/\s+/)[0] ?? undefined,
      availabilityUrl: `${SITE_URL}/therapist/dashboard?tab=availability`,
    };
    const element = React.createElement(template.component, templateData);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function" ? template.subject(templateData) : template.subject;
    const messageId = crypto.randomUUID();

    const normalized = therapistEmail.toLowerCase();
    const { data: existing } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token, used_at")
      .eq("email", normalized)
      .maybeSingle();
    let unsub = existing && !existing.used_at ? existing.token : generateToken();
    if (!existing || existing.used_at) {
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .upsert(
          { token: unsub, email: normalized },
          { onConflict: "email", ignoreDuplicates: true },
        );
      const { data: stored } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", normalized)
        .maybeSingle();
      unsub = stored?.token ?? unsub;
    }

    const { error: enqErr } = await deliverEmail(supabaseAdmin, {
      message_id: messageId,
      to: therapistEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: "therapist-approved",
      idempotency_key: messageId,
      unsubscribe_token: unsub,
      queued_at: new Date().toISOString(),
    });
    if (enqErr) console.error("[therapist-approval-email] enqueue failed", enqErr);
  } catch (err) {
    console.error("[therapist-approval-email] unexpected error", err);
  }
}
