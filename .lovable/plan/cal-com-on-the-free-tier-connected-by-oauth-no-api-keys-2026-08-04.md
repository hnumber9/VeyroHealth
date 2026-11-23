# Cal.com on the free tier, connected by OAuth — no API keys

Makes sense, and yes it's possible. Cal.com has a proper OAuth flow, "Continue with Cal.com", that is separate from the deprecated Platform product Reilly mentioned. It's the direct equivalent of what we do with Calendly: the therapist clicks one button, signs in or signs up at Cal.com with email/Google/Microsoft, approves Veyro, and lands back in their Veyro dashboard connected. No API key, ever.

## What OAuth gives us

Requested scopes, all documented and available:

- Event types read/write — create the 30/45/60-minute sessions for them, so they don't have to
- Schedules read/write — availability
- Slots and bookings read/write — show times, create and cancel bookings
- Calendars and conferencing apps read/write — connect their Google/Microsoft calendar and their video app
- Webhooks read/write — instant booking notifications instead of polling

Cal.com also ships an onboarding embed that renders their availability and calendar-connection setup inside our own page, so "set up your availability" happens on the Veyro dashboard rather than by sending them off to Cal.com.

Tokens refresh automatically, so this is a one-time connect exactly like Calendly.

## Applying for the OAuth client — step by step

One client covers the whole platform. You register Veyro once; every therapist then authorises their own Cal.com account against it. It is not repeated per therapist, and we never touch their accounts.

1. Sign in to Cal.com on the Veyro account and go to `app.cal.com/settings/developer/oauth`.
2. Create a client:
   - Name: Veyro Health. Logo and website: `veyrohealth.com`.
   - Redirect URIs, add both: `https://veyrohealth.com/therapist/calcom/callback` and the preview equivalent (`https://id-preview--be78a48d-d6e2-4e8c-9965-280dce04b280.lovable.app/therapist/calcom/callback`).
   - Scopes — tick these 11 under **User** only, and nothing under Team or Organization:
     - View meeting types
     - Create, edit, and delete meeting types
     - View bookings
     - Create, edit, and delete bookings
     - View availability
     - Create, edit, and delete availability
     - View connected apps
     - Connect and disconnect apps
     - View personal info and primary email address
     - View webhooks
     - Create, edit, and delete webhooks

     Leave off: verified emails/phone numbers, edit personal info, AI credit balance, spend AI credits, insights, and every Team and Organization scope. Therapists connect as individuals, so team/org scopes only make the consent screen look more invasive than it is.
3. Save. The client sits in a **pending** state while a Cal.com admin reviews it, and you get an email approving or rejecting it. Worth nudging Reilly to fast-track it. **Status: done — client created, pending review, ID and secret in hand.**
4. I'll request the client ID and secret through the secure secrets form (`CALCOM_OAUTH_CLIENT_ID`, `CALCOM_OAUTH_CLIENT_SECRET`) as the first build step — don't paste them into chat.

While the client is pending, Cal.com will reject the authorise call. So we build the whole flow now and it goes live the moment review clears — no code change needed at that point. Until then the existing API-key path stays in place as the working fallback, and the dashboard shows the new Connect button with a short "awaiting Cal.com approval" note rather than a dead end.

## Free tier

The therapist's own Cal.com account can be free — free gives unlimited event types, so multiple durations at different prices work, which is the thing Calendly free blocks. Each therapist owns their own account.

The only account that might need a paid plan is Veyro's, and only if Cal.com gates that developer OAuth page. That's the one thing to check in step 1. If it's gated, or if review drags, we stay on Calendly free (one duration) until it clears — we do not fall back to asking therapists for API keys.

## What gets built once approved

1. **Connect with Cal.com** — one button in the therapist dashboard. OAuth round trip, tokens stored server-side, automatic refresh. Replaces the API-key screen entirely, which gets deleted.
2. **Availability set up in Veyro** — the Cal.com onboarding embed in the dashboard so they connect their calendar and set their hours without leaving Veyro.
3. **Sessions and pricing** — therapist adds 30/45/60-minute sessions with a price each; Veyro creates the matching Cal.com event types for them via the API.
4. **Booking with payment** — client picks a session and a time, Veyro holds the slot for 15 minutes, Stripe embedded checkout takes payment at the therapist's price (amount set server-side only), then the Cal.com booking is created. Failed or expired payment releases the hold and no booking is made.
5. **Instant sync via webhook** — booking created and cancelled events, signature-verified and duplicate-safe, so dashboards and confirmation emails no longer depend on someone opening a page.
6. **Refunds and cancellations** — cancellation cut-off that refunds and cancels the Cal.com booking; admin can refund manually.
7. **Commission** — platform fee per booking, direct-invite clients stay fee-free.
8. **Retire Calendly, and the API-key path** — only after the Cal.com OAuth flow is proven working end to end with a real approved client. Then, in one clean-up pass: delete the API-key connect screen and `connectCalcom(apiKey)`, remove the Calendly connect route, callback, embed, webhook and polling sync, drop the now-dead Calendly columns and tables in a migration, and strip Calendly copy from onboarding and emails. Existing Calendly bookings stay visible and profiles stay live through the changeover. Nothing gets deleted before the replacement is verified.

## Technical notes

Cal.com API v2 with per-therapist OAuth access and refresh tokens, stored server-side only and never sent to the browser. Booking, payment and refund logic runs server-side; Stripe goes through the existing gateway client (test mode now, live needs the live key and webhook secret). Payments live in their own table keyed to the Cal.com booking uid. Only opaque Veyro IDs in Stripe metadata — no clinical detail. Times stored UTC, rendered in the viewer's timezone.

## Decisions, confirmed

- **Video:** all of them. The therapist connects whichever they use — Google Meet, Teams or Zoom — with Cal.com video as the default for anyone who connects nothing.
- **Refunds:** 24-hour policy. Cancel more than 24 hours before the session and it's an automatic full refund with the Cal.com booking cancelled. Inside 24 hours, no automatic refund; admin can still refund manually.
- **Platform fee:** 10% per booking. Direct-invite clients stay fee-free.
- **Money:** Veyro collects everything and settles with therapists separately. No Stripe Connect for now, so payouts stay manual — I'll add a per-therapist earnings view in the admin portal so you can see what's owed.
