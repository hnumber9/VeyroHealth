import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { startBookingInputSchema } from "@/lib/booking-schema";
import {
  isWebhookEnvironmentAllowed,
  serverRuntimeContext,
  stripeEnvironmentFor,
} from "@/lib/payments-environment";

/** Public: bookable slots for one service over a date window. */
export const getServiceAvailability = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        therapistId: z.string().uuid(),
        serviceId: z.string().uuid(),
        from: z.string().min(8).max(40),
        to: z.string().min(8).max(40),
        nonce: z.string().max(40).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store, max-age=0");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: service } = await supabaseAdmin
      .from("therapist_services")
      .select("id, calcom_event_type_id, duration_minutes, active, therapist_id")
      .eq("id", data.serviceId)
      .eq("therapist_id", data.therapistId)
      .maybeSingle();

    if (!service?.active || !service.calcom_event_type_id) {
      return { slots: [] as string[], reason: "unavailable" as const };
    }

    const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
    const credentials = await getCalcomCredentialsByTherapist(data.therapistId);
    if (!credentials) return { slots: [] as string[], reason: "no_calendar" as const };

    try {
      const { getAvailableSlots } = await import("@/lib/calcom.server");
      const slots = await getAvailableSlots(credentials.bearer, {
        eventTypeId: service.calcom_event_type_id,
        start: data.from,
        end: data.to,
        timeZone: credentials.timezone ?? "Europe/London",
      });
      return { slots, reason: null };
    } catch (error) {
      console.error("[booking:availability]", error);
      return { slots: [] as string[], reason: "error" as const };
    }
  });

/**
 * Hold the slot, create a booking intent, and open Stripe checkout.
 * The booking is only created in Cal.com once payment succeeds.
 */
/** Signed-in user from the optional bearer token, or null for guests. */
async function optionalUser(): Promise<{ id: string; email: string | null } | null> {
  const auth = getRequest()?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

export const startBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startBookingInputSchema.parse(input))
  .handler(async ({ data }) => {
    // The Stripe environment is decided here, never by the client.
    const stripeEnv = stripeEnvironmentFor(serverRuntimeContext(getRequest()?.url));
    const user = await optionalUser();
    const userId = user?.id ?? null;
    const clientEmail = (user?.email ?? data.clientEmail ?? "").toLowerCase();
    if (!clientEmail) return { error: "Please enter your email address." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Guests can't book with an email that already belongs to a therapist account,
    // otherwise they could never create a patient account to see the booking.
    if (!userId) {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("email", clientEmail)
        .maybeSingle();
      if (existing?.user_id) {
        const { count: tpCount } = await supabaseAdmin
          .from("therapist_profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", existing.user_id);
        if ((tpCount ?? 0) > 0) {
          return {
            error:
              "This email is registered as a therapist account. Please book with a different email address.",
          };
        }
      }
    }

    // Light abuse guard: limit open holds per email.
    const { count: recentHolds } = await supabaseAdmin
      .from("booking_intents")
      .select("id", { count: "exact", head: true })
      .eq("client_email", clientEmail)
      .eq("status", "pending_payment")
      .gt("created_at", new Date(Date.now() - 60 * 60_000).toISOString());
    if ((recentHolds ?? 0) >= 5) {
      return { error: "Too many unfinished bookings. Please wait a few minutes and try again." };
    }

    const { data: service } = await supabaseAdmin
      .from("therapist_services")
      .select("id, name, duration_minutes, price_cents, currency, active, calcom_event_type_id")
      .eq("id", data.serviceId)
      .eq("therapist_id", data.therapistId)
      .maybeSingle();
    if (!service?.active || !service.calcom_event_type_id) {
      return { error: "That session is no longer available to book." };
    }

    const { data: therapist } = await supabaseAdmin
      .from("therapist_profiles")
      .select("id, display_name, published")
      .eq("id", data.therapistId)
      .maybeSingle();
    if (!therapist?.published) return { error: "This therapist isn't taking bookings right now." };

    const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
    const credentials = await getCalcomCredentialsByTherapist(data.therapistId);
    if (!credentials) return { error: "This therapist's calendar isn't connected yet." };

    // Direct-invite clients pay no platform commission.
    const { data: link } = await supabaseAdmin
      .from("therapist_clients")
      .select("linked_via")
      .eq("therapist_id", data.therapistId)
      .eq("client_email", clientEmail)
      .maybeSingle();
    const isDirectInvite = link?.linked_via === "invite";

    const { HOLD_MINUTES, PLATFORM_FEE_RATE } = await import("@/lib/booking.server");
    const { reserveSlot, releaseReservedSlot, CalcomError } = await import("@/lib/calcom.server");

    let reservation: Awaited<ReturnType<typeof reserveSlot>>;
    try {
      reservation = await reserveSlot(credentials.bearer, {
        eventTypeId: service.calcom_event_type_id,
        slotStart: data.slotStart,
        reservationDurationMinutes: HOLD_MINUTES,
      });
    } catch (error) {
      if (error instanceof CalcomError && error.status === 409) {
        return { error: "Someone just took that time. Please choose another slot." };
      }
      console.error("[booking:reserve]", error);
      return { error: "We couldn't hold that time. Please try another slot." };
    }

    const holdExpiresAt =
      reservation.reservationUntil ?? new Date(Date.now() + HOLD_MINUTES * 60000).toISOString();

    const platformFeeCents = isDirectInvite
      ? 0
      : Math.round(service.price_cents * PLATFORM_FEE_RATE);

    const { data: intent, error: intentError } = await supabaseAdmin
      .from("booking_intents")
      .insert({
        therapist_id: data.therapistId,
        client_user_id: userId,
        client_email: clientEmail,
        client_name: data.clientName,
        price_cents: service.price_cents,
        currency: service.currency,
        platform_fee_cents: platformFeeCents,
        is_direct_invite: isDirectInvite,
        status: "pending_payment",
        stripe_environment: stripeEnv,
        service_id: service.id,
        service_name: service.name,
        service_duration_minutes: service.duration_minutes,
        calcom_reservation_uid: reservation.uid,
        slot_start: data.slotStart,
        hold_expires_at: holdExpiresAt,
      })
      .select("id")
      .single();

    if (intentError || !intent) {
      console.error("[booking:intent]", intentError);
      await releaseReservedSlot(credentials.bearer, reservation.uid);
      return { error: "We couldn't start that booking. Please try again." };
    }

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(stripeEnv);

      const returnUrl = (() => {
        try {
          const u = new URL(data.returnUrl);
          u.searchParams.set("booking", "complete");
          u.searchParams.set("intent", intent.id);
          return u.toString();
        } catch {
          return data.returnUrl;
        }
      })();

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: returnUrl,
        customer_email: clientEmail,
        allow_promotion_codes: true,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: service.currency.toLowerCase(),
              unit_amount: service.price_cents,
              product_data: {
                name: `${service.name} with ${therapist.display_name}`,
                description: `${service.duration_minutes} minutes`,
              },
            },
          },
        ],
        payment_intent_data: {
          description: `${service.name} with ${therapist.display_name}`,
        },
        metadata: {
          veyroBookingIntentId: intent.id,
          userId: userId ?? "guest",
        },
      });

      await supabaseAdmin
        .from("booking_intents")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", intent.id);

      if (!session.client_secret) throw new Error("Stripe did not return a client secret");

      return {
        clientSecret: session.client_secret,
        bookingIntentId: intent.id,
        holdExpiresAt,
      };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      console.error("[booking:checkout]", error);
      await releaseReservedSlot(credentials.bearer, reservation.uid);
      await supabaseAdmin
        .from("booking_intents")
        .update({ status: "failed", calcom_reservation_uid: null })
        .eq("id", intent.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Give up a hold when the client closes checkout without paying. */
export const abandonBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ bookingIntentId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent } = await supabaseAdmin
      .from("booking_intents")
      .select("id, status")
      .eq("id", data.bookingIntentId)
      .maybeSingle();
    if (!intent) return { ok: false };
    if (intent.status !== "pending_payment") return { ok: true };

    const { releaseIntentHold } = await import("@/lib/booking.server");
    await releaseIntentHold(intent.id);
    return { ok: true };
  });

/**
 * Fallback for the checkout return page. Stripe's webhook remains the primary
 * confirmation path, but this safely retries a paid booking for its owner if
 * the webhook's Cal.com call was interrupted or rejected.
 */
export const finalizeMyPaidBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ bookingIntentId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent } = await supabaseAdmin
      .from("booking_intents")
      .select("id, status, paid_at, stripe_environment")
      .eq("id", data.bookingIntentId)
      .maybeSingle();

    if (!intent) return { ok: false as const };
    // Production never confirms a booking paid with test-mode money.
    const allowed = isWebhookEnvironmentAllowed(
      intent.stripe_environment === "live" ? "live" : "sandbox",
      serverRuntimeContext(getRequest()?.url),
    );
    if (!allowed) return { ok: false as const };
    if (intent.status === "booked") return { ok: true as const };
    // "booking" is included so a confirmation interrupted mid-way (a claim
    // older than 2 minutes) is retried instead of staying stuck.
    if (!intent.paid_at || !["paid", "paid_needs_review", "booking"].includes(intent.status)) {
      return { ok: false as const };
    }

    const { confirmPaidBookingIntent } = await import("@/lib/booking.server");
    const result = await confirmPaidBookingIntent(intent.id);
    return { ok: result.ok };
  });

/** Poll after checkout (works for guests: the intent id is the payer's secret). */
export const getBookingIntentStatus = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ bookingIntentId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent } = await supabaseAdmin
      .from("booking_intents")
      .select("id, status, service_name, slot_start, service_duration_minutes, client_user_id")
      .eq("id", data.bookingIntentId)
      .maybeSingle();
    if (!intent) return { status: "unknown" as const };

    const { data: appointment } = await supabaseAdmin
      .from("appointments")
      .select("id, starts_at, ends_at, manage_token")
      .eq("booking_intent_id", intent.id)
      .maybeSingle();

    return {
      status: intent.status,
      serviceName: intent.service_name,
      slotStart: intent.slot_start,
      durationMinutes: intent.service_duration_minutes,
      isGuest: !intent.client_user_id,
      appointment: appointment
        ? { id: appointment.id, starts_at: appointment.starts_at, ends_at: appointment.ends_at }
        : null,
      manageToken: appointment?.manage_token ?? null,
    };
  });
