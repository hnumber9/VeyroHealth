import { deliverEmail } from "@/lib/deliver-email.server";
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "Veyro Health";
const SENDER_DOMAIN = "mail.veyrohealth.com";
const FROM_DOMAIN = "mail.veyrohealth.com";
const CLIENT_TEMPLATE = "booking-cancelled";
const THERAPIST_TEMPLATE = "therapist-booking-cancelled";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureUnsubscribeToken(db: any, normalizedTo: string): Promise<string> {
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

/** A cancellation notice is only sent once per appointment/recipient/template. */
async function alreadySent(
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

async function enqueue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  templateName: string,
  recipient: string,
  appointmentId: string,
  templateData: Record<string, unknown>,
): Promise<void> {
  const template = TEMPLATES[templateName];
  if (!template) return;
  const normalizedTo = recipient.trim().toLowerCase();
  if (!normalizedTo) return;

  const { data: suppressed } = await db
    .from("suppressed_emails")
    .select("email")
    .eq("email", normalizedTo)
    .maybeSingle();
  if (suppressed) return;
  if (await alreadySent(db, templateName, recipient, appointmentId)) return;

  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function" ? template.subject(templateData) : template.subject;

  const messageId = crypto.randomUUID();
  const idempotencyKey = `${templateName}-${appointmentId}`;
  const unsubscribeToken = await ensureUnsubscribeToken(db, normalizedTo);

  const { error } = await deliverEmail(
    db,
    {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
    { appointment_id: appointmentId, idempotency_key: idempotencyKey },
  );

  if (error) {
    console.error("[booking-cancellation-email] enqueue failed", error);
    await db.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipient,
      status: "failed",
      error_message: error.message ?? "Failed to enqueue email",
      metadata: { appointment_id: appointmentId, idempotency_key: idempotencyKey },
    });
  }
}

/**
 * Notify both the client and the therapist that an appointment was cancelled.
 * Safe to call more than once — sends are de-duplicated per appointment.
 */
export async function sendBookingCancellationForAppointment(
  appointmentId: string,
  cancellationReason?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: appt } = await supabaseAdmin
    .from("appointments")
    .select("id, therapist_id, client_email, client_name, starts_at, ends_at, service_name")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return { success: false, error: "Appointment not found" };

  const { data: therapist } = await supabaseAdmin
    .from("therapist_profiles")
    .select("display_name, user_id")
    .eq("id", appt.therapist_id)
    .maybeSingle();

  const appointmentDate = formatDate(appt.starts_at);
  const appointmentTime = formatTimeRange(appt.starts_at, appt.ends_at);
  const sessionType = appt.service_name ?? null;

  if (appt.client_email) {
    await enqueue(supabaseAdmin, CLIENT_TEMPLATE, appt.client_email, appt.id, {
      clientName: appt.client_name ?? null,
      therapistName: therapist?.display_name ?? "Your therapist",
      appointmentDate,
      appointmentTime,
      sessionType,
      cancellationReason: cancellationReason ?? null,
    });
  }

  if (therapist?.user_id) {
    const { data: therapistProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("user_id", therapist.user_id)
      .maybeSingle();
    const therapistEmail = therapistProfile?.email?.trim();
    if (therapistEmail) {
      await enqueue(supabaseAdmin, THERAPIST_TEMPLATE, therapistEmail, appt.id, {
        therapistName: therapist.display_name,
        clientName: appt.client_name,
        clientEmail: appt.client_email,
        appointmentDate,
        appointmentTime,
        sessionType,
        cancellationReason: cancellationReason ?? null,
      });
    }
  }

  return { success: true };
}
