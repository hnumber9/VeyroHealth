import type { StripeEnv } from "@/lib/stripe.server";

/**
 * Cancels the underlying appointment when a payment is refunded in Stripe
 * (dashboard refund, partial refund, or API refund we didn't initiate).
 * Safe to call repeatedly — it no-ops once the appointment is cancelled.
 */
export async function cancelAppointmentForRefundedPayment(
  paymentIntentId: string,
  env: StripeEnv,
  refundAmountCents: number | null,
  reason = "Refunded in Stripe",
) {
  if (!paymentIntentId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: intent } = await supabaseAdmin
    .from("booking_intents")
    .select("id, price_cents, refunded_at")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("stripe_environment", env)
    .maybeSingle();

  if (!intent) {
    console.warn("[refund-cancel] no booking intent for payment intent", paymentIntentId);
    return;
  }

  if (!intent.refunded_at) {
    await supabaseAdmin
      .from("booking_intents")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_amount_cents: refundAmountCents ?? intent.price_cents,
        refund_reason: reason,
      })
      .eq("id", intent.id);
  }

  const { data: appt } = await supabaseAdmin
    .from("appointments")
    .select("id, status, therapist_id, calcom_booking_uid")
    .eq("booking_intent_id", intent.id)
    .maybeSingle();

  if (!appt || appt.status === "cancelled") return;

  if (appt.calcom_booking_uid) {
    try {
      const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
      const { cancelBooking } = await import("@/lib/calcom.server");
      const credentials = await getCalcomCredentialsByTherapist(appt.therapist_id);
      if (credentials) {
        await cancelBooking(credentials.bearer, appt.calcom_booking_uid, reason);
      }
    } catch (error) {
      console.error("[refund-cancel] cal.com cancel failed", error);
    }
  }

  await supabaseAdmin
    .from("appointments")
    .update({
      status: "cancelled",
      payment_status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", appt.id);

  try {
    const { sendBookingCancellationForAppointment } =
      await import("@/lib/send-booking-cancellation.server");
    await sendBookingCancellationForAppointment(appt.id, reason);
  } catch (error) {
    console.error("[refund-cancel] cancellation email failed", error);
  }
}
