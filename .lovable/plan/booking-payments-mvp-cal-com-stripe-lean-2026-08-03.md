# Booking & Payments MVP — Cal.com + Stripe (lean)

Replaces the Nylas plan. Same outcome, far less to build, because Cal.com already does the hard part.

## Why this is now simple

Cal.com's API has a native **slot reservation** endpoint: reserve a slot for a custom hold duration with an API key, then confirm it into a real booking. That is exactly the pending-then-pay-then-confirm sequence, provided as a single API call — it was the one genuinely risky piece of the Nylas plan and it disappears entirely.

Two more things that matter for an MVP:

- Cal.com's free individual plan allows **unlimited event types**, so one per duration (50 min, 80 min, 30 min intro) with no subscription. Calendly's free tier caps at one, which is why it can't do this.
- The therapist connects their own Google or Microsoft calendar **inside Cal.com**, so Cal.com's verified OAuth apps are used, not Veyro's. No Google verification, no Microsoft app registration, no OAuth paperwork for us. Google Meet and Teams links come from that connection automatically.

Veyro still owns the prices, the booking screen and the payment — the client never sees Cal.com.

## Flow

```text
Client picks service (50 min, £70)
  -> Veyro asks Cal.com for slots for that duration
  -> Client picks a time
  -> Veyro reserves the slot on Cal.com (15 min hold)
  -> Stripe Payment Element, price set server-side
  -> payment_intent.succeeded webhook -> Veyro confirms the Cal.com booking
  -> Meet/Teams link returned -> confirmation email
Payment abandoned -> hold expires on its own -> slot free again
```

The reservation expiring by itself is the reason this stays small: no expiry worker, no cleanup job, no orphaned calendar events.

## Therapist setup

In the dashboard, replacing the Calendly step: sign up for Cal.com free, connect Google or Microsoft calendar, set working hours, paste a personal API key into Veyro. Veyro then creates one Cal.com event type per service the therapist has priced. Same shape as the existing Calendly guide, so the setup guide component gets rewritten rather than invented.

## Build order

- **M1 — Services & pricing.** `therapist_services` (name, duration, price, currency, active). Therapist sets their own durations and prices. Every booking stores an immutable snapshot of name/duration/price so later repricing never rewrites history.
- **M2 — Cal.com connection.** API key capture, calendar-health check, working hours, auto-creation of one event type per service, and a gate so a therapist can't go bookable without a healthy connection plus one active service. Reuses the existing published-requires-calendar rule.
- **M3 — Client booking.** Price list on the therapist profile, slots per duration, slot picker, server-side reserve with a visible countdown.
- **M4 — Stripe.** PaymentIntent priced server-side only, Payment Element in-page, webhook-driven confirmation, and a `manual_review` flag for the rare paid-but-hold-expired case so money is never kept with no appointment.
- **M5 — Admin.** Appointments list with payment status, cancel and refund from Stripe, service and price visibility.

Behind a feature flag; Calendly keeps working until M4 passes end to end.

## Data model

`therapist_services` is new. `booking_intents` and `payment_events` already exist with the Stripe fields needed, so M4 is mostly wiring rather than new schema. `appointments` gains the service snapshot, the Cal.com booking id and reservation id, and `hold_expires_at`. `calendly_connections` gets a Cal.com sibling table. Times stored UTC, rendered in the viewer's timezone. Only opaque Veyro ids go into Stripe or Cal.com metadata — no clinical detail.

## Short spike first (half a day, not a phase)

Before M3, I'll prove on one test therapist: reserve a slot, confirm the slot vanishes from availability, take a test payment, confirm the booking, check a real Google Meet link is generated, then abandon a payment and confirm the hold releases. If reservation doesn't hold reliably, I add a Postgres exclusion constraint on (therapist, time range) as a second line of defence and report back.

## Costs

Cal.com free for therapists. Stripe at UK card rates. No Nylas, no video cost, no new infrastructure.

## Out of scope

Veyro video, recording, in-house booking engine, multi-currency, packages, insurance billing, therapist payouts, cancellation-policy automation. GBP only, one payment per appointment.

## Decisions needed

Hold length (I'll use 15 minutes), your refund policy and cut-off, and whether Veyro receiving client money then paying therapists separately is fine with your accountant — that last one is the only thing that could force Stripe Connect and change scope.
