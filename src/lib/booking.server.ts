import { createBooking, releaseReservedSlot } from "@/lib/calcom.server";
import { describeCalcomBookingFailure } from "@/lib/calcom-booking-fields";

export const HOLD_MINUTES = 15;
export const PLATFORM_FEE_RATE = 0.15;

/**
 * Turn a paid booking intent into a real Cal.com booking plus a Veyro
 * appointment. Idempotent: a second call for the same intent is a no-op.
 */
export async function confirmPaidBookingIntent(bookingIntentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: intent } = await supabaseAdmin
    .from("booking_intents")
    .select("*")
    .eq("id", bookingIntentId)
    .maybeSingle();

  if (!intent) {
    console.error("[booking:confirm] intent not found", bookingIntentId);
    return { ok: false, reason: "not_found" as const };
  }
  if (intent.status === "booked" || intent.calcom_booking_uid) {
    return { ok: true, alreadyBooked: true as const };
  }

  // Atomically claim the intent so concurrent callers (webhook + confirmation
  // page) can't both create a Cal.com booking. A claim older than 2 minutes is
  // treated as abandoned (crashed worker) and may be reclaimed.
  const staleBefore = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data: claimed } = await supabaseAdmin
    .from("booking_intents")
    .update({ status: "booking" })
    .eq("id", intent.id)
    .is("calcom_booking_uid", null)
    .or(
      `status.eq.paid,status.eq.pending_payment,status.eq.paid_needs_review,and(status.eq.booking,updated_at.lt.${staleBefore})`,
    )
    .select("id");
  if (!claimed?.length) {
    return { ok: true, alreadyBooked: true as const };
  }

  const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
  // A calendar credential failure must never leave a paid intent silently stuck.
  const credentials = await getCalcomCredentialsByTherapist(intent.therapist_id).catch((error) => {
    console.error("[booking:confirm] calendar credentials failed", error);
    return null;
  });

  const { data: service } = intent.service_id
    ? await supabaseAdmin
        .from("therapist_services")
        .select("calcom_event_type_id, duration_minutes, name")
        .eq("id", intent.service_id)
        .maybeSingle()
    : { data: null };

  // Payment already succeeded, so never lose the booking: flag it for admin
  // follow-up rather than throwing the customer's money away.
  if (!credentials || !service?.calcom_event_type_id || !intent.slot_start) {
    await supabaseAdmin
      .from("booking_intents")
      .update({ status: "paid_needs_review", needs_manual_review: true })
      .eq("id", intent.id);
    console.error("[booking:confirm] cannot book — missing calendar config", bookingIntentId);
    await notifyBookingNeedsReview(
      intent.id,
      !credentials
        ? "The therapist's Cal.com calendar isn't connected or its sign-in has expired."
        : "This session type isn't linked to a Cal.com event type.",
    );
    return { ok: false, reason: "missing_calendar" as const };
  }

  const durationMinutes = intent.service_duration_minutes ?? service.duration_minutes;

  // Free our own hold first so Cal.com doesn't see the slot as taken.
  if (intent.calcom_reservation_uid) {
    await releaseReservedSlot(credentials.bearer, intent.calcom_reservation_uid).catch(() => {});
  }

  let booking: Awaited<ReturnType<typeof createBooking>>;
  try {
    booking = await createBooking(credentials.bearer, {
      eventTypeId: service.calcom_event_type_id,
      start: intent.slot_start,
      attendeeName: intent.client_name ?? intent.client_email,
      attendeeEmail: intent.client_email,
      attendeeTimeZone: credentials.timezone ?? "Europe/London",
      lengthInMinutes: durationMinutes,
      sessionTitle: `${intent.service_name ?? service.name ?? "Therapy session"} via Veyro`,
      ...(intent.calcom_reservation_uid ? { reservationUid: intent.calcom_reservation_uid } : {}),
      metadata: { veyroBookingIntentId: intent.id },
    });
  } catch (error) {
    console.error("[booking:confirm] cal.com booking failed", error);
    await supabaseAdmin
      .from("booking_intents")
      .update({ status: "paid_needs_review", needs_manual_review: true })
      .eq("id", intent.id);
    const message = error instanceof Error ? error.message : String(error);
    await notifyBookingNeedsReview(intent.id, describeCalcomBookingFailure(message), {
      detail: message,
    });
    return { ok: false, reason: "calcom_failed" as const };
  }

  const startsAt = booking.start ?? intent.slot_start;
  const endsAt =
    booking.end ?? new Date(new Date(startsAt).getTime() + durationMinutes * 60000).toISOString();

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .insert({
      therapist_id: intent.therapist_id,
      client_user_id: intent.client_user_id,
      client_email: intent.client_email,
      client_name: intent.client_name,
      starts_at: startsAt,
      ends_at: endsAt,
      meeting_url: booking.meetingUrl ?? booking.location ?? null,
      status: "confirmed",
      price_cents: intent.price_cents,
      currency: intent.currency,
      payment_status: "paid",
      stripe_payment_intent_id: intent.stripe_payment_intent_id,
      booking_intent_id: intent.id,
      service_id: intent.service_id,
      service_name: intent.service_name,
      service_duration_minutes: durationMinutes,
      calcom_booking_uid: booking.uid,
      calcom_reservation_uid: intent.calcom_reservation_uid,
    })
    .select("id")
    .single();

  if (appointmentError) {
    console.error("[booking:confirm] appointment insert failed", appointmentError);
    await supabaseAdmin
      .from("booking_intents")
      .update({
        status: "paid_needs_review",
        needs_manual_review: true,
        calcom_booking_uid: booking.uid,
      })
      .eq("id", intent.id);
    await notifyBookingNeedsReview(
      intent.id,
      "The booking was created in Cal.com but couldn't be saved in Veyro.",
    );
    return { ok: false, reason: "appointment_failed" as const };
  }

  await supabaseAdmin
    .from("booking_intents")
    .update({
      status: "booked",
      booked_at: new Date().toISOString(),
      calcom_booking_uid: booking.uid,
      needs_manual_review: false,
    })
    .eq("id", intent.id);

  // Link the client to the therapist so dashboards and notes work.
  await supabaseAdmin.from("therapist_clients").upsert(
    {
      therapist_id: intent.therapist_id,
      client_user_id: intent.client_user_id,
      client_email: intent.client_email,
      linked_via: "booking",
    },
    { onConflict: "therapist_id,client_email", ignoreDuplicates: true },
  );

  try {
    const { sendBookingConfirmationForAppointment } =
      await import("@/lib/send-booking-confirmation.server");
    await sendBookingConfirmationForAppointment(appointment.id);
  } catch (error) {
    console.error("[booking:confirm] confirmation email failed", error);
  }

  return { ok: true, appointmentId: appointment.id, bookingUid: booking.uid };
}

/** Release the Cal.com hold for an abandoned or expired intent. */
export async function releaseIntentHold(bookingIntentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: intent } = await supabaseAdmin
    .from("booking_intents")
    .select("id, status, therapist_id, calcom_reservation_uid")
    .eq("id", bookingIntentId)
    .maybeSingle();
  if (!intent || intent.status === "booked" || !intent.calcom_reservation_uid) return;

  const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
  const credentials = await getCalcomCredentialsByTherapist(intent.therapist_id);
  if (credentials) {
    await releaseReservedSlot(credentials.bearer, intent.calcom_reservation_uid);
  }

  await supabaseAdmin
    .from("booking_intents")
    .update({ status: "expired", calcom_reservation_uid: null })
    .eq("id", intent.id);
}

/**
 * Tell admins straight away when a booking's money and appointment fall out of
 * step — a paid booking that couldn't be confirmed, or a refund that failed —
 * so it never sits unnoticed. Never throws: the booking state is already saved.
 */
export async function notifyBookingNeedsReview(
  bookingIntentId: string,
  reason: string,
  options: { detail?: string; kind?: "booking" | "refund" } = {},
) {
  const kind = options.kind ?? "booking";
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const { getAdminNotificationRecipients } = await import("@/lib/admin-recipients.server");
    const { data: intent } = await supabaseAdmin
      .from("booking_intents")
      .select(
        "id, therapist_id, client_email, client_name, service_name, slot_start, price_cents, currency",
      )
      .eq("id", bookingIntentId)
      .maybeSingle();
    if (!intent) return;
    const { data: tp } = await supabaseAdmin
      .from("therapist_profiles")
      .select("display_name")
      .eq("id", intent.therapist_id)
      .maybeSingle();
    for (const admin of await getAdminNotificationRecipients()) {
      await sendTemplateEmail("booking-needs-review", admin, {
        templateData: {
          kind,
          therapistName: tp?.display_name ?? "Unknown therapist",
          clientName: intent.client_name ?? undefined,
          clientEmail: intent.client_email,
          serviceName: intent.service_name ?? undefined,
          slotStart: intent.slot_start ?? undefined,
          amount: `${(intent.price_cents / 100).toFixed(2)} ${intent.currency.toUpperCase()}`,
          reason,
          detail: options.detail?.slice(0, 500),
          intentId: intent.id,
        },
        idempotencyKey: `booking-needs-review-${kind}-${intent.id}-${admin}`,
      });
    }
  } catch (error) {
    console.error("[booking] needs-review alert failed", error);
  }
}
