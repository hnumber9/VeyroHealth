# Veyro

Veyro (https://veyrohealth.com) is a UK online therapy marketplace. Patients browse a
directory of vetted therapists, book and pay for sessions (including free introductory
calls), and manage their appointments, notes and reviews. Therapists apply, are approved by
Veyro admins, connect their calendar and get paid by Veyro (Veyro keeps a platform fee and
pays therapists out manually). Admins approve therapists, manage clients, publish
clinically reviewed SEO condition pages and handle partner enquiries.

## Stack

| Layer           | Technology                                                                   |
| --------------- | ---------------------------------------------------------------------------- |
| Framework       | TanStack Start v1 (file-based routing, SSR, server functions) on Vite 7      |
| UI              | React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Radix)                     |
| Database & auth | Supabase (Postgres with row level security, Supabase Auth) via Lovable Cloud |
| Payments        | Stripe Checkout (embedded), sandbox and live environments                    |
| Scheduling      | Cal.com Platform (OAuth per therapist, slot reservations, webhooks)          |
| Background jobs | Inngest (durable post-session review reminders)                              |
| Email           | Lovable managed email (React Email templates in `src/lib/email-templates`)   |
| Hosting         | Cloudflare Workers (`wrangler.jsonc`, entry `src/server.ts`)                 |
| Analytics       | Google Tag Manager / Google Analytics                                        |

Key directories:

- `src/routes/` – pages and server routes. `src/routes/api/public/*` are external callbacks
  (Stripe and Cal.com webhooks, Inngest, approval links) that verify the caller themselves.
- `src/lib/*.functions.ts` – server functions called from the app.
- `src/lib/*.server.ts` – server-only helpers (Stripe, Cal.com, email, admin recipients).
- `src/integrations/supabase/` – generated Supabase clients and types (do not edit).
- `supabase/migrations/` and `drizzle/migrations/` – database schema history.

## How a booking flows

1. **Browse** – the public directory (`/therapists`) and profiles (`/therapist/$slug`) show
   published, approved therapists with live Cal.com availability per session type.
2. **Start booking** – `startBooking` (`src/lib/booking.functions.ts`) validates the input,
   checks the service and therapist are bookable, rejects guest emails that belong to a
   therapist account, limits open holds per email and **reserves the slot in Cal.com** for a
   short hold.
3. **Booking intent** – a `booking_intents` row (`pending_payment`) records the price,
   platform fee, reservation and the Stripe environment, which is decided on the server
   (`src/lib/payments-environment.ts`), never by the client.
4. **Pay** – an embedded Stripe Checkout session is created. If that fails, the Cal.com hold is
   released.
5. **Confirm** – the Stripe webhook (`src/routes/api/public/payments/webhook.ts`, signature
   checked with a constant-time comparison) and the confirmation page both try to finalise.
   An atomic claim makes sure only one of them books the Cal.com slot and creates the
   `appointments` row.
6. **After booking** – Veyro emails the patient and therapist. Guests get a private manage
   link (`/booking/manage/$token`) to cancel or reschedule within the 48-hour policy. Cal.com
   webhooks keep cancellations and reschedules in sync. An Inngest workflow sends a review
   reminder 24 hours after the session ends.

## Security model

- **Row level security on every public table.** Patients see only their own appointments,
  notes shared with them and their own reviews. Therapists see only their own profile,
  clients and appointments. Sensitive tables (payments, enquiries, SEO pages, approval
  tokens) have no client policies and are reachable only through server code.
- **Roles live in `user_roles`** (`client`, `therapist`, `admin`) and are checked with a
  `security definer` `has_role` function. Admin server functions verify the caller's
  admin role before using the service-role client.
- **Therapists can't publish themselves.** Database triggers keep approval and publication
  fields unchanged unless an admin or the service role changes them.
- **Guest bookings** are keyed by unguessable intent IDs and per-appointment manage tokens,
  verified on the server.
- **Webhooks** (Stripe, Cal.com, Inngest) verify signatures. Production rejects sandbox
  Stripe events.
- **Secrets are server-only** and read inside handlers via `process.env`. The browser only
  gets `VITE_*` publishable values.

Architectural rules and their reasons are listed in [`AGENTS.md`](./AGENTS.md).

## Local setup

```bash
npm install
npm run dev        # http://localhost:8080
```

Browser environment (`.env`, publishable values only):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

Server environment (secrets, never committed):

- Supabase: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`,
  `PAYMENTS_LIVE_WEBHOOK_SECRET`
- Cal.com: `CALCOM_OAUTH_CLIENT_ID`, `CALCOM_OAUTH_CLIENT_SECRET`, `CALCOM_OAUTH_STATE_SECRET`,
  `CALCOM_WEBHOOK_SECRET`, optional `CALCOM_REDIRECT_ORIGIN`
- Calendly (legacy): `CALENDLY_OAUTH_CLIENT_ID`, `CALENDLY_OAUTH_CLIENT_SECRET`,
  `CALENDLY_WEBHOOK_SIGNING_KEY`, optional `CALENDLY_REDIRECT_ORIGIN`
- Inngest: `INNGEST_API_KEY`, `INNGEST_SIGNING_KEY`
- Email: `LOVABLE_API_KEY`, optional `LOVABLE_SEND_URL`
- Notifications: `PREVIEW_ADMIN_EMAIL`, `NOTIFICATION_EXCLUDED_EMAILS` (comma-separated)

## Tests

```bash
npm test           # vitest run, config in vitest.config.ts (with the "@" alias)
```

Tests sit next to the code (`src/lib/*.test.ts`). They cover booking and payment environment
rules, admin profile actions, notification recipients, SEO pages, metadata and rich text,
therapist search, enquiries and review reminders. `vitest.admin.config.ts` runs a smaller
admin and SEO subset.

## Database migrations

- `supabase/migrations/` – the original schema history (timestamped SQL files).
  `20260803210000_recreate_booking_admin_tables.sql` is a no-op on the live database. It
  records tables that were created outside version control, so the schema can be rebuilt.
- `drizzle/migrations/` – newer migrations, created and applied with Drizzle Kit
  (`drizzle.config.ts`). Don't edit applied migrations or the `meta/` folder. To change the
  schema, add a new migration that reverses or extends an earlier one.
- Every new table in `public` needs explicit `GRANT`s and row level security policies in the
  same migration.

## Project docs

- [`AGENTS.md`](./AGENTS.md) – architecture decisions and the reasons for them.
- [`roadmap.md`](./roadmap.md) – current task list and open items.
