import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Therapist-initiated cancellation: frees the Cal.com slot and refunds the
 * client in full, then sends Veyro-branded cancellation emails to both sides.
 */
export const cancelAppointmentAsTherapist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ appointmentId: z.string().uuid(), reason: z.string().trim().max(300).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) return { ok: false as const, error: "Therapist profile not found." };

    const { data: appt } = await supabase
      .from("appointments")
      .select("id, therapist_id, status, calcom_booking_uid, booking_intent_id")
      .eq("id", data.appointmentId)
      .eq("therapist_id", profile.id)
      .maybeSingle();
    if (!appt) return { ok: false as const, error: "Appointment not found." };
    if (appt.status === "cancelled") return { ok: true as const, alreadyCancelled: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (appt.calcom_booking_uid) {
      try {
        const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
        const { cancelBooking } = await import("@/lib/calcom.server");
        const credentials = await getCalcomCredentialsByTherapist(appt.therapist_id);
        if (credentials) {
          await cancelBooking(
            credentials.bearer,
            appt.calcom_booking_uid,
            data.reason ?? "Cancelled by therapist via Veyro",
          );
        }
      } catch (error) {
        console.error("[therapist-cancel] cal.com cancel failed", error);
      }
    }

    let refunded = false;
    if (appt.booking_intent_id) {
      const { data: intent } = await supabaseAdmin
        .from("booking_intents")
        .select("id, stripe_payment_intent_id, stripe_environment, price_cents, refunded_at")
        .eq("id", appt.booking_intent_id)
        .maybeSingle();

      if (intent?.refunded_at) {
        refunded = true;
      } else if (intent?.stripe_payment_intent_id) {
        try {
          const { createStripeClient } = await import("@/lib/stripe.server");
          const stripe = createStripeClient(
            intent.stripe_environment === "live" ? "live" : "sandbox",
          );
          await stripe.refunds.create({
            payment_intent: intent.stripe_payment_intent_id,
            reason: "requested_by_customer",
          });
          refunded = true;
          await supabaseAdmin
            .from("booking_intents")
            .update({
              status: "refunded",
              refunded_at: new Date().toISOString(),
              refund_amount_cents: intent.price_cents,
              refund_reason: data.reason ?? "Cancelled by therapist",
            })
            .eq("id", intent.id);
        } catch (error) {
          console.error("[therapist-cancel] refund failed", error);
          await supabaseAdmin
            .from("booking_intents")
            .update({
              needs_manual_review: true,
              refund_reason: "Refund failed after therapist cancellation",
            })
            .eq("id", intent.id);
          const { notifyBookingNeedsReview } = await import("@/lib/booking.server");
          await notifyBookingNeedsReview(
            intent.id,
            "The therapist cancelled, but the automatic refund in Stripe failed.",
            { kind: "refund", detail: error instanceof Error ? error.message : String(error) },
          );
        }
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "cancelled",
        ...(refunded ? { payment_status: "refunded" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", appt.id);
    if (updateError) {
      console.error("[therapist-cancel] appointment update failed", updateError);
      throw new Error("We couldn't cancel this session. Please try again.");
    }

    try {
      const { sendBookingCancellationForAppointment } =
        await import("@/lib/send-booking-cancellation.server");
      await sendBookingCancellationForAppointment(appt.id, data.reason ?? "Cancelled by therapist");
    } catch (error) {
      console.error("[therapist-cancel] email failed", error);
    }

    return { ok: true as const, refunded };
  });
