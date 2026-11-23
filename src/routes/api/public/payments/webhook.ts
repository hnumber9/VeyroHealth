import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { isWebhookEnvironmentAllowed, serverRuntimeContext } from "@/lib/payments-environment";

async function recordEvent(
  eventId: string,
  eventType: string,
  env: StripeEnv,
  bookingIntentId: string | null,
  payload: unknown,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("payment_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    environment: env,
    booking_intent_id: bookingIntentId,
    payload: payload as never,
  });
  // Duplicate stripe_event_id means Stripe retried an event we already handled.
  if (error && error.code === "23505") return false;
  if (error) console.error("[payments:webhook] event log failed", error);
  return true;
}

async function markPaid(session: any, env: StripeEnv) {
  const bookingIntentId = session?.metadata?.veyroBookingIntentId as string | undefined;
  if (!bookingIntentId) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("booking_intents")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .eq("id", bookingIntentId)
    .eq("stripe_environment", env)
    // Never rewind an intent already being booked/booked back to "paid".
    .eq("status", "pending_payment");

  const { confirmPaidBookingIntent } = await import("@/lib/booking.server");
  await confirmPaidBookingIntent(bookingIntentId);
}

async function markFailed(session: any, env: StripeEnv) {
  const bookingIntentId = session?.metadata?.veyroBookingIntentId as string | undefined;
  if (!bookingIntentId) return;
  const { releaseIntentHold } = await import("@/lib/booking.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await releaseIntentHold(bookingIntentId);
  await supabaseAdmin
    .from("booking_intents")
    .update({ status: "failed" })
    .eq("id", bookingIntentId)
    .eq("stripe_environment", env);
}

async function handleRefund(object: any, env: StripeEnv) {
  // charge.refunded -> Charge; refund.created / charge.refund.updated -> Refund
  const paymentIntentId =
    typeof object?.payment_intent === "string" ? object.payment_intent : null;
  if (!paymentIntentId) return;
  const amount =
    typeof object?.amount_refunded === "number"
      ? object.amount_refunded
      : typeof object?.amount === "number"
        ? object.amount
        : null;
  const { cancelAppointmentForRefundedPayment } = await import("@/lib/refund-cancellation.server");
  await cancelAppointmentForRefundedPayment(paymentIntentId, env, amount, "Refunded in Stripe");
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[payments:webhook] invalid env param:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        if (!isWebhookEnvironmentAllowed(env, serverRuntimeContext(request.url))) {
          console.error("[payments:webhook] rejected sandbox event in production");
          return new Response("Sandbox events are not accepted in production", { status: 403 });
        }

        let eventIdForRetry: string | null = null;
        try {
          const event = await verifyWebhook(request, env);
          const session = event.data.object;
          const bookingIntentId =
            (session?.metadata?.veyroBookingIntentId as string | undefined) ?? null;

          const isNew = await recordEvent(event.id, event.type, env, bookingIntentId, event);
          if (!isNew) return Response.json({ received: true, duplicate: true });
          eventIdForRetry = event.id;

          switch (event.type) {
            case "checkout.session.completed":
              if (session.payment_status !== "unpaid") await markPaid(session, env);
              break;
            case "checkout.session.async_payment_succeeded":
              await markPaid(session, env);
              break;
            case "checkout.session.async_payment_failed":
            case "checkout.session.expired":
              await markFailed(session, env);
              break;
            case "charge.refunded":
            case "refund.created":
            case "refund.updated":
            case "charge.refund.updated":
              if (event.type !== "charge.refunded" && session?.status && session.status !== "succeeded") break;
              await handleRefund(session, env);
              break;
            default:
              console.log("[payments:webhook] unhandled event:", event.type);
          }

          return Response.json({ received: true });
        } catch (error) {
          console.error("[payments:webhook] error", error);
          // Forget this event so Stripe's retry is processed rather than
          // skipped as a duplicate. Handlers are idempotent, so a retry is safe.
          if (eventIdForRetry) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("payment_events")
              .delete()
              .eq("stripe_event_id", eventIdForRetry);
          }
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
