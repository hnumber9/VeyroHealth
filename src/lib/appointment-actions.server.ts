import { CANCELLATION_WINDOW_HOURS } from "@/lib/cancellation-policy";

/**
 * Shared cancel / reschedule / note logic. Callers MUST verify the caller is
 * allowed to act on the appointment (account owner or valid manage token)
 * before calling these — they use the privileged client.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function cancelAppointmentCore(appointmentId: string, reason?: string) {
  const db = await admin();
  const { data: appt } = await db
    .from("appointments")
    .select("id, therapist_id, starts_at, status, calcom_booking_uid, booking_intent_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appt) return { ok: false as const, error: "Session not found." };
  if (appt.status === "cancelled")
    return { ok: true as const, alreadyCancelled: true as const, refunded: false };

  const hoursUntil = (new Date(appt.starts_at).getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
    return {
      ok: false as const,
      error: `Sessions can only be cancelled more than ${CANCELLATION_WINDOW_HOURS} hours before the start time. Please contact your therapist directly.`,
    };
  }

  if (appt.calcom_booking_uid) {
    try {
      const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
      const { cancelBooking } = await import("@/lib/calcom.server");
      const credentials = await getCalcomCredentialsByTherapist(appt.therapist_id);
      if (credentials) {
        await cancelBooking(
          credentials.bearer,
          appt.calcom_booking_uid,
          "Cancelled by client via Veyro",
        );
      }
    } catch (error) {
      console.error("[client-cancel] cal.com cancel failed", error);
    }
  }

  let refunded = false;
  let refundError: string | null = null;
  if (appt.booking_intent_id) {
    const { data: intent } = await db
      .from("booking_intents")
      .select("id, stripe_payment_intent_id, stripe_environment, price_cents, refunded_at")
      .eq("id", appt.booking_intent_id)
      .maybeSingle();

    if (intent?.refunded_at) {
      refunded = true;
    } else if (intent?.stripe_payment_intent_id) {
      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      try {
        const env = intent.stripe_environment === "live" ? "live" : "sandbox";
        const stripe = createStripeClient(env);
        await stripe.refunds.create({
          payment_intent: intent.stripe_payment_intent_id,
          reason: "requested_by_customer",
        });
        refunded = true;
        await db
          .from("booking_intents")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_amount_cents: intent.price_cents,
            refund_reason: reason ?? `Cancelled by client (${CANCELLATION_WINDOW_HOURS}h policy)`,
          })
          .eq("id", intent.id);
      } catch (error) {
        refundError = getStripeErrorMessage(error);
        console.error("[client-cancel] refund failed", error);
        await db
          .from("booking_intents")
          .update({ needs_manual_review: true, refund_reason: refundError ?? "Refund failed" })
          .eq("id", appt.booking_intent_id);
        const { notifyBookingNeedsReview } = await import("@/lib/booking.server");
        await notifyBookingNeedsReview(
          intent.id,
          "The patient cancelled, but the automatic refund in Stripe failed.",
          { kind: "refund", detail: refundError ?? undefined },
        );
      }
    }
  }

  // payment_status only allows unpaid/paid/refunded; free or failed-refund sessions keep their current value.
  const { error: updateError } = await db
    .from("appointments")
    .update({
      status: "cancelled",
      ...(refunded ? { payment_status: "refunded" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", appt.id);
  if (updateError) {
    console.error("[client-cancel] appointment update failed", updateError);
    return { ok: false as const, error: "We couldn't cancel this session. Please try again." };
  }

  try {
    const { sendBookingCancellationForAppointment } =
      await import("@/lib/send-booking-cancellation.server");
    await sendBookingCancellationForAppointment(appt.id, reason ?? "Cancelled by client");
  } catch (error) {
    console.error("[client-cancel] cancellation email failed", error);
  }

  return { ok: true as const, refunded };
}

export async function getRescheduleSlotsCore(appointmentId: string, from: string, to: string) {
  const db = await admin();
  const { data: appt } = await db
    .from("appointments")
    .select("id, therapist_id, service_id, status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || appt.status === "cancelled")
    return { slots: [] as string[], reason: "unavailable" as const };

  const { data: service } = appt.service_id
    ? await db
        .from("therapist_services")
        .select("calcom_event_type_id")
        .eq("id", appt.service_id)
        .maybeSingle()
    : { data: null };
  if (!service?.calcom_event_type_id)
    return { slots: [] as string[], reason: "no_calendar" as const };

  const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
  const credentials = await getCalcomCredentialsByTherapist(appt.therapist_id);
  if (!credentials) return { slots: [] as string[], reason: "no_calendar" as const };

  try {
    const { getAvailableSlots } = await import("@/lib/calcom.server");
    const slots = await getAvailableSlots(credentials.bearer, {
      eventTypeId: service.calcom_event_type_id,
      start: from,
      end: to,
      timeZone: credentials.timezone ?? "Europe/London",
    });
    return { slots, reason: null };
  } catch (error) {
    console.error("[client-reschedule:slots]", error);
    return { slots: [] as string[], reason: "error" as const };
  }
}

export async function rescheduleAppointmentCore(appointmentId: string, slotStart: string) {
  const db = await admin();
  const { data: appt } = await db
    .from("appointments")
    .select(
      "id, therapist_id, starts_at, ends_at, status, calcom_booking_uid, service_duration_minutes, client_email",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appt) return { ok: false as const, error: "Session not found." };
  if (appt.status === "cancelled")
    return { ok: false as const, error: "This session has been cancelled." };

  const hoursUntil = (new Date(appt.starts_at).getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
    return {
      ok: false as const,
      error: `Sessions can only be moved more than ${CANCELLATION_WINDOW_HOURS} hours before the start time. Please contact your therapist directly.`,
    };
  }
  if (!appt.calcom_booking_uid) {
    return {
      ok: false as const,
      error: "This session can't be moved online — please contact your therapist.",
    };
  }

  const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
  const credentials = await getCalcomCredentialsByTherapist(appt.therapist_id);
  if (!credentials)
    return { ok: false as const, error: "The therapist's calendar isn't connected." };

  let booking: { uid: string; start: string; end: string; meetingUrl?: string; location?: string };
  const { rescheduleBooking, findLiveBookingForUid } = await import("@/lib/calcom.server");
  let bookingUid = appt.calcom_booking_uid;
  const unavailable = {
    ok: false as const,
    error: "That time is no longer available. Please pick another slot.",
  };
  try {
    const liveBooking = await findLiveBookingForUid(
      credentials.bearer,
      bookingUid,
      appt.client_email,
    );
    if (liveBooking) bookingUid = liveBooking.uid;
    booking = await rescheduleBooking(credentials.bearer, bookingUid, {
      start: slotStart,
      reason: "Rescheduled by client via Veyro",
    });
  } catch (error) {
    let recovered: Awaited<ReturnType<typeof findLiveBookingForUid>> = null;
    try {
      recovered = await findLiveBookingForUid(credentials.bearer, bookingUid, appt.client_email);
    } catch (lookupError) {
      console.error("[client-reschedule] live booking lookup failed", lookupError);
    }
    if (!recovered) {
      console.error("[client-reschedule] cal.com reschedule failed", error);
      return unavailable;
    }
    bookingUid = recovered.uid;
    if (recovered.start && new Date(recovered.start).getTime() === new Date(slotStart).getTime()) {
      booking = recovered;
    } else {
      try {
        booking = await rescheduleBooking(credentials.bearer, bookingUid, {
          start: slotStart,
          reason: "Rescheduled by client via Veyro",
        });
      } catch (retryError) {
        console.error("[client-reschedule] retry after recovery failed", retryError);
        return unavailable;
      }
    }
  }

  const duration =
    appt.service_duration_minutes ??
    Math.round((new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) / 60000);
  const startsAt = booking.start ?? slotStart;
  const endsAt =
    booking.end ?? new Date(new Date(startsAt).getTime() + duration * 60000).toISOString();

  await db
    .from("appointments")
    .update({
      starts_at: startsAt,
      ends_at: endsAt,
      calcom_booking_uid: booking.uid ?? bookingUid,
      meeting_url: booking.meetingUrl ?? booking.location ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appt.id);

  try {
    const { sendBookingRescheduleForAppointment } =
      await import("@/lib/send-booking-reschedule.server");
    await sendBookingRescheduleForAppointment(appt.id, {
      previousStartsAt: appt.starts_at,
      previousEndsAt: appt.ends_at,
      rescheduleReason: "Rescheduled by client",
    });
  } catch (error) {
    console.error("[client-reschedule] email failed", error);
  }

  return { ok: true as const, startsAt };
}

/** Resolve a "Manage my booking" token to its appointment (null if invalid/expired). */
export async function resolveManageToken(token: string) {
  if (!/^[a-f0-9]{32,128}$/.test(token)) return null;
  const db = await admin();
  const { data } = await db
    .from("appointments")
    .select(
      "id, therapist_id, client_name, client_email, starts_at, ends_at, status, meeting_url, service_name, client_note",
    )
    .eq("manage_token", token)
    .maybeSingle();
  if (!data) return null;
  // Link stays usable for 7 days after the session so patients can see history.
  if (new Date(data.ends_at).getTime() < Date.now() - 7 * 86_400_000) return null;
  return data;
}
