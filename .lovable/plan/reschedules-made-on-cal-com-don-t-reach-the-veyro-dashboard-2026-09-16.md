# Reschedules made on Cal.com don't reach the Veyro dashboard

## What Helen saw

She moved an appointment to the following week using the reschedule link. Cal.com
recorded it and emailed everyone, but the Veyro dashboard still shows the original
time, and Refresh doesn't change it.

Confirmed in the data: her session (17 Sep, 09:00) has never been modified since
it was created — the change never arrived at Veyro at all.

## Why

Veyro learns about a change made on Cal.com in exactly one way: a notification
Cal.com sends to us at the moment it happens. If that notification doesn't
arrive — the therapist's calendar was connected before we started asking for
reschedule notifications, or the registration quietly failed at connect time —
nothing tells Veyro anything, and there's no second chance. Refresh only looks
for brand new bookings; it never re-checks the ones we already have.

## The fix

Two parts, so this stops being a single point of failure.

1. **Re-check existing sessions.** For every upcoming session, Veyro asks
   Cal.com what the live booking now is and follows the reschedule trail to the
   current one. If the date, time or meeting link has moved, the session is
   updated in place, and a Veyro reschedule email goes out if we hadn't already
   sent one for that change. This runs when the dashboard loads, on the 60-second
   auto-refresh, and on the Refresh button — so a missed notification self-heals
   within a minute instead of never.

2. **Make sure notifications are actually registered.** On dashboard load, Veyro
   re-confirms the therapist's Cal.com account is set to notify us of
   cancellations and reschedules, instead of only doing that once at connect
   time. Existing therapists get fixed without reconnecting anything.

Helen's session gets corrected as soon as the first part ships and her dashboard
loads.

## Technical section

- New `reconcileTherapistAppointments(therapistId)` in a server-only module,
  called from the therapist dashboard data fetcher and from `cancelAppointment`
  pre-checks. For each `appointments` row with `status = 'confirmed'` and
  `starts_at > now()`, call the existing `findLiveBookingForUid` (already handles
  the `rescheduledToUid` chain and the list-based fallback). On a difference,
  update `starts_at`, `ends_at`, `calcom_booking_uid`, `meeting_url`; when the
  live booking is cancelled with no replacement, set `status = 'cancelled'`.
- Emails reuse `sendBookingRescheduleForAppointment` /
  `sendBookingCancellationForAppointment`. Guard against duplicates by checking
  `email_send_log` for the same template + recipient + new start time before
  sending, since the webhook may also have fired.
- Throttle: reconcile at most once per therapist per 60s (short-circuit on
  `updated_at`) and cap at ~25 upcoming rows per pass, to keep dashboard load
  and the auto-refresh cheap; failures are logged and never block the dashboard.
- `ensureCancellationWebhook` is currently only called from
  `therapist.calcom.callback.ts`. Also call it (fire-and-forget, errors
  swallowed) from the dashboard's Cal.com connection check, keeping the same
  hardcoded `https://www.veyrohealth.com/api/public/calcom/webhook` subscriber
  URL so preview never steals production events.
- The webhook route itself is correct and stays as is; also treat
  `payload.rescheduledFromUid` as a lookup key alongside `rescheduleUid`, since
  Cal.com's field name varies by API version.
- Client-side reschedule path (`client-reschedule.functions.ts`) is unchanged —
  it already resolves the live booking itself.
