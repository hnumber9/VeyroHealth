import { deliverEmail } from "@/lib/deliver-email.server";
import * as React from "react";
import { render } from "@react-email/components";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { resolveTherapistApprovalUrl } from "@/lib/therapist-approval-url";

const SITE_NAME = "Veyro";
const SENDER_DOMAIN = "mail.veyrohealth.com";
const FROM_DOMAIN = "mail.veyrohealth.com";
const SITE_URL = "https://www.veyrohealth.com";

interface OnboardingEmailInput {
  therapistProfileId?: string | null;
  fullName: string;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  yearsInPractice?: string | null;
  qualifications?: string | null;
  specialties?: string[];
  languages?: string[];
  insuranceProviders?: string[];
  calendlyUrl?: string | null;
  sessionFee?: string | null;
  offersIntroCall?: boolean;
  slug?: string | null;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const sendTherapistOnboardingCompleteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: OnboardingEmailInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const template = TEMPLATES["therapist-onboarding-complete"];
    if (!template) {
      console.error("[therapist-onboarding-email] template missing");
      return { success: false, error: "Template not configured" };
    }
    const { getAdminNotificationRecipients } = await import("@/lib/admin-recipients.server");
    const adminRecipients = await getAdminNotificationRecipients();

    const therapistEmail = context.claims?.email ?? "";
    const completedAt = new Date().toISOString();

    // Look up the exact therapist_profiles row saved by the onboarding submit so
    // the admin email can deep-link to that therapist in the admin portal.
    let reviewUrl: string = `${SITE_URL}/admin`;
    try {
      const resolved = await resolveTherapistApprovalUrl({
        userId: context.userId,
        submittedProfileId: data.therapistProfileId ?? null,
        supabase: supabaseAdmin,
        siteUrl: SITE_URL,
        mintToken: false,
      });
      if (resolved.therapistProfileId) {
        reviewUrl = `${SITE_URL}/admin?review=${resolved.therapistProfileId}`;
      } else {
        console.error("[therapist-onboarding-email] therapist profile not resolved", {
          userId: context.userId,
          submittedProfileId: data.therapistProfileId,
          error: resolved.error,
        });
      }
    } catch (err) {
      console.error("[therapist-onboarding-email] review url setup failed", err);
    }

    const templateData = { ...data, email: therapistEmail, completedAt, reviewUrl };

    try {
      const element = React.createElement(template.component, templateData);
      const html = await render(element);
      const plainText = await render(element, { plainText: true });
      const subject =
        typeof template.subject === "function" ? template.subject(templateData) : template.subject;

      let adminSent = 0;
      for (const recipient of adminRecipients) {
        const messageId = crypto.randomUUID();
        const normalizedTo = recipient.toLowerCase();
        const { data: existing } = await supabaseAdmin
          .from("email_unsubscribe_tokens")
          .select("token, used_at")
          .eq("email", normalizedTo)
          .maybeSingle();
        let unsubscribeToken = existing && !existing.used_at ? existing.token : generateToken();
        if (!existing || existing.used_at) {
          await supabaseAdmin
            .from("email_unsubscribe_tokens")
            .upsert(
              { token: unsubscribeToken, email: normalizedTo },
              { onConflict: "email", ignoreDuplicates: true },
            );
          const { data: stored } = await supabaseAdmin
            .from("email_unsubscribe_tokens")
            .select("token")
            .eq("email", normalizedTo)
            .maybeSingle();
          unsubscribeToken = stored?.token ?? unsubscribeToken;
        }

        const { error: enqueueError } = await deliverEmail(supabaseAdmin, {
          message_id: messageId,
          to: recipient,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          reply_to: therapistEmail || undefined,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: plainText,
          purpose: "transactional",
          label: "therapist-onboarding-complete",
          idempotency_key: messageId,
          unsubscribe_token: unsubscribeToken,
          queued_at: completedAt,
        });

        if (enqueueError) {
          console.error("[therapist-onboarding-email] enqueue failed", enqueueError);
          await supabaseAdmin.from("email_send_log").insert({
            message_id: messageId,
            template_name: "therapist-onboarding-complete",
            recipient_email: recipient,
            status: "failed",
            error_message: enqueueError.message ?? "Failed to enqueue email",
          });
        } else {
          adminSent += 1;
        }
      }

      if (!adminSent) return { success: false, error: "Failed to enqueue email" };

      // Fire off a separate therapist-facing "we received your profile" email.
      // Failures here do not fail the primary admin notification.
      if (therapistEmail) {
        try {
          const receivedTemplate = TEMPLATES["therapist-onboarding-received"];
          if (receivedTemplate) {
            const receivedMessageId = crypto.randomUUID();
            const receivedData = { fullName: data.fullName };
            const receivedElement = React.createElement(receivedTemplate.component, receivedData);
            const receivedHtml = await render(receivedElement);
            const receivedText = await render(receivedElement, { plainText: true });
            const receivedSubject =
              typeof receivedTemplate.subject === "function"
                ? receivedTemplate.subject(receivedData)
                : receivedTemplate.subject;

            // unsubscribe token for therapist
            const normalizedTherapist = therapistEmail.toLowerCase();
            const { data: existingT } = await supabaseAdmin
              .from("email_unsubscribe_tokens")
              .select("token, used_at")
              .eq("email", normalizedTherapist)
              .maybeSingle();
            let therapistUnsub =
              existingT && !existingT.used_at ? existingT.token : generateToken();
            if (!existingT || existingT.used_at) {
              await supabaseAdmin
                .from("email_unsubscribe_tokens")
                .upsert(
                  { token: therapistUnsub, email: normalizedTherapist },
                  { onConflict: "email", ignoreDuplicates: true },
                );
              const { data: storedT } = await supabaseAdmin
                .from("email_unsubscribe_tokens")
                .select("token")
                .eq("email", normalizedTherapist)
                .maybeSingle();
              therapistUnsub = storedT?.token ?? therapistUnsub;
            }

            const { error: recvErr } = await deliverEmail(supabaseAdmin, {
              message_id: receivedMessageId,
              to: therapistEmail,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: receivedSubject,
              html: receivedHtml,
              text: receivedText,
              purpose: "transactional",
              label: "therapist-onboarding-received",
              idempotency_key: receivedMessageId,
              unsubscribe_token: therapistUnsub,
              queued_at: completedAt,
            });
            if (recvErr) {
              console.error(
                "[therapist-onboarding-email] therapist confirmation enqueue failed",
                recvErr,
              );
              await supabaseAdmin.from("email_send_log").insert({
                message_id: receivedMessageId,
                template_name: "therapist-onboarding-received",
                recipient_email: therapistEmail,
                status: "failed",
                error_message: recvErr.message ?? "Failed to enqueue email",
              });
            }
          }
        } catch (recvUnexpected) {
          console.error(
            "[therapist-onboarding-email] therapist confirmation unexpected error",
            recvUnexpected,
          );
        }
      }

      return { success: true };
    } catch (err) {
      console.error("[therapist-onboarding-email] unexpected error", err);
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });
