import { deliverEmail } from "@/lib/deliver-email.server";
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "Veyro Health";
const SENDER_DOMAIN = "mail.veyrohealth.com";
const FROM_DOMAIN = "mail.veyrohealth.com";
const TEMPLATE_NAME = "booking-confirmation";
const THERAPIST_TEMPLATE_NAME = "therapist-booking-confirmation";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureUnsubscribeToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  normalizedTo: string,
): Promise<string> {
  const { data: existing } = await db
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedTo)
    .maybeSingle();
  let token = existing && !existing.used_at ? existing.token : generateToken();
  if (!existing || existing.used_at) {
    await db
      .from("email_unsubscribe_tokens")
      .upsert({ token, email: normalizedTo }, { onConflict: "email", ignoreDuplicates: true });
    const { data: stored } = await db
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalizedTo)
      .maybeSingle();
    token = stored?.token ?? token;
  }
  return token;
}

/**
 * A send is only considered already handled when the newest log row for this
 * appointment/template is `sent`, or a `pending` row younger than 10 minutes.
 * Stale pending rows and failed/dlq rows must be retryable.
 */
async function alreadyHandled(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  templateName: string,
  recipient: string,
  appointmentId: string,
): Promise<boolean> {
  const { data } = await db
    .from("email_send_log")
    .select("status, created_at")
    .eq("template_name", templateName)
    .eq("recipient_email", recipient)
    .eq("metadata->>appointment_id", appointmentId)
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = data?.[0];
  if (!latest) return false;
  if (latest.status === "sent") return true;
  if (latest.status === "pending") {
    return Date.now() - new Date(latest.created_at).getTime() < 10 * 60 * 1000;
  }
  return false;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
}

function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/London",
    });
  return `${fmt(new Date(startIso))} – ${fmt(new Date(endIso))}`;
}

function inferSessionInfo(
  startIso: string,
  endIso: string,
  fee50: number | null,
  fee80: number | null,
): { sessionType: string; price: string | null } {
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  const is80 = minutes >= 65;
  const type = `${is80 ? 80 : 50}-minute session`;
  const fee = is80 ? fee80 : fee50;
  const price = typeof fee === "number" && !Number.isNaN(fee) ? `£${fee}` : null;
  return { sessionType: type, price };
}

/**
 * Core booking-confirmation sender. Callable from server contexts that already
 * hold admin privileges (e.g. verified webhooks) or wrapped by an authenticated
 * server function for UI-triggered resends.
 */
export async function sendBookingConfirmationForAppointment(
  appointmentId: string,
  opts: { force?: boolean } = {},
): Promise<{ success: boolean; error?: string; recipient?: string }> {
  try {
    const { scheduleReviewReminder } = await import("./review-reminder.server");
    await scheduleReviewReminder(appointmentId);
  } catch (error) {
    console.error("[review-reminder] scheduling failed", error);
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const template = TEMPLATES[TEMPLATE_NAME];
  if (!template) return { success: false, error: "Template not configured" };

  try {
    const { data: appt, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select(
        "id, therapist_id, client_email, client_name, starts_at, ends_at, meeting_url, service_name, manage_token",
      )
      .eq("id", appointmentId)
      .maybeSingle();
    if (apptErr) throw new Error(apptErr.message);
    if (!appt) return { success: false, error: "Appointment not found" };

    const recipient = (appt.client_email ?? "").trim();
    if (!recipient) return { success: false, error: "No recipient email on file" };
    const normalizedTo = recipient.toLowerCase();

    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("email")
      .eq("email", normalizedTo)
      .maybeSingle();
    if (suppressed) return { success: false, error: "Recipient is suppressed" };

    const { data: therapist } = await supabaseAdmin
      .from("therapist_profiles")
      .select("display_name, session_fee_50, session_fee_80, user_id")
      .eq("id", appt.therapist_id)
      .maybeSingle();

    const inferred = inferSessionInfo(
      appt.starts_at,
      appt.ends_at,
      (therapist?.session_fee_50 as number | null) ?? null,
      (therapist?.session_fee_80 as number | null) ?? null,
    );
    const sessionType = appt.service_name || inferred.sessionType;

    const templateData = {
      clientName: appt.client_name ?? null,
      therapistName: therapist?.display_name ?? "Your therapist",
      appointmentDate: formatDate(appt.starts_at),
      appointmentTime: formatTimeRange(appt.starts_at, appt.ends_at),
      sessionType,
      meetingUrl: appt.meeting_url ?? null,
      manageUrl: appt.manage_token
        ? `https://www.veyrohealth.com/booking/manage/${appt.manage_token}`
        : null,
    };

    const element = React.createElement(template.component, templateData);
    const html = await render(element);
    const plainText = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function" ? template.subject(templateData) : template.subject;

    const unsubscribeToken = await ensureUnsubscribeToken(supabaseAdmin, normalizedTo);

    const messageId = crypto.randomUUID();
    const queuedAt = new Date().toISOString();
    const idempotencyKey = opts.force
      ? `${TEMPLATE_NAME}-${appt.id}-resend-${messageId.slice(0, 8)}`
      : `${TEMPLATE_NAME}-${appt.id}`;

    const alreadyQueued = opts.force
      ? false
      : await alreadyHandled(supabaseAdmin, TEMPLATE_NAME, recipient, appt.id);

    if (!alreadyQueued) {
      const { error: enqueueError } = await deliverEmail(
        supabaseAdmin,
        {
          message_id: messageId,
          to: recipient,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: plainText,
          purpose: "transactional",
          label: TEMPLATE_NAME,
          idempotency_key: idempotencyKey,
          unsubscribe_token: unsubscribeToken,
          queued_at: queuedAt,
        },
        { appointment_id: appt.id, idempotency_key: idempotencyKey },
      );

      if (enqueueError) {
        console.error("[booking-confirmation-email] enqueue failed", enqueueError);
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: TEMPLATE_NAME,
          recipient_email: recipient,
          status: "failed",
          error_message: enqueueError.message ?? "Failed to enqueue email",
          metadata: { appointment_id: appt.id, idempotency_key: idempotencyKey },
        });
        return { success: false, error: "Failed to enqueue email" };
      }
    }

    const therapistTemplate = TEMPLATES[THERAPIST_TEMPLATE_NAME];
    if (!opts.force && therapistTemplate && therapist?.user_id) {
      const { data: therapistProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", therapist.user_id)
        .maybeSingle();
      const therapistRecipient = therapistProfile?.email?.trim().toLowerCase();

      if (therapistRecipient) {
        const { data: therapistSuppressed } = await supabaseAdmin
          .from("suppressed_emails")
          .select("email")
          .eq("email", therapistRecipient)
          .maybeSingle();

        const therapistAlreadyQueued = await alreadyHandled(
          supabaseAdmin,
          THERAPIST_TEMPLATE_NAME,
          therapistRecipient,
          appt.id,
        );

        if (!therapistSuppressed && !therapistAlreadyQueued) {
          const therapistData = {
            therapistName: therapist.display_name,
            clientName: appt.client_name,
            clientEmail: appt.client_email,
            appointmentDate: formatDate(appt.starts_at),
            appointmentTime: formatTimeRange(appt.starts_at, appt.ends_at),
            sessionType,
            meetingUrl: appt.meeting_url,
          };
          const therapistElement = React.createElement(therapistTemplate.component, therapistData);
          const therapistHtml = await render(therapistElement);
          const therapistText = await render(therapistElement, { plainText: true });
          const therapistSubject =
            typeof therapistTemplate.subject === "function"
              ? therapistTemplate.subject(therapistData)
              : therapistTemplate.subject;
          const therapistMessageId = crypto.randomUUID();
          const therapistIdempotencyKey = `${THERAPIST_TEMPLATE_NAME}-${appt.id}-${therapistMessageId.slice(0, 8)}`;
          const therapistUnsubscribeToken = await ensureUnsubscribeToken(
            supabaseAdmin,
            therapistRecipient,
          );

          const { error: therapistEnqueueError } = await deliverEmail(
            supabaseAdmin,
            {
              message_id: therapistMessageId,
              to: therapistRecipient,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: therapistSubject,
              html: therapistHtml,
              text: therapistText,
              purpose: "transactional",
              label: THERAPIST_TEMPLATE_NAME,
              idempotency_key: therapistIdempotencyKey,
              unsubscribe_token: therapistUnsubscribeToken,
              queued_at: queuedAt,
            },
            { appointment_id: appt.id, idempotency_key: therapistIdempotencyKey },
          );
          if (therapistEnqueueError) {
            await supabaseAdmin.from("email_send_log").insert({
              message_id: therapistMessageId,
              template_name: THERAPIST_TEMPLATE_NAME,
              recipient_email: therapistRecipient,
              status: "failed",
              error_message: therapistEnqueueError.message ?? "Failed to enqueue email",
              metadata: { appointment_id: appt.id, idempotency_key: therapistIdempotencyKey },
            });
          }
        }
      }
    }

    return { success: true, recipient };
  } catch (err) {
    console.error("[booking-confirmation-email] unexpected error", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
