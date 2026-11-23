# Book first, sign up last + guest checkout

## What patients will experience
1. Open a therapist's profile, see all session types and times, pick a slot — no account needed.
2. Final step (same screen as payment): name, email, and a choice:
   - "Create an account" (password box), or
   - "Continue as guest".
   Already signed-in patients skip this and see their details pre-filled.
3. Pay (or £0 with a discount code) as today. The slot hold, 48-hour refund rule and confirmation emails stay the same.
4. Confirmation email gets a "Manage my booking" button: cancel (with refund if 48h+ away), reschedule, and add the pre-session note — no login.
5. If a guest later signs up with the same email, their past bookings appear in their dashboard automatically.
6. Reviews and the "all my bookings" dashboard still need an account.

## Order of work
1. Remove the sign-in requirement before seeing times; move details to the final step.
2. Let the booking/payment step work for signed-in users, new sign-ups, and guests.
3. Confirmation page works for guests (finds booking by its payment reference, not by account).
4. Secure "Manage my booking" link and page (cancel, reschedule, note).
5. Add link to confirmation, reschedule and cancellation emails.
6. Auto-link guest bookings to an account on sign-up/sign-in (existing email backfill extended).
7. Test: paid, £0, cancel with refund, cancel inside 48h, reschedule, note — as guest and as account holder.

## Technical details
- Database: `booking_intents.client_user_id` and `appointments.client_user_id` already nullable on appointments; make it nullable on `booking_intents`. Add `manage_token` (random 32-byte, unique) + `manage_token_expires_at` to `appointments`.
- `startBooking`: drop `requireSupabaseAuth`; new public server fn that reads the bearer if present (userId from token), otherwise takes validated name/email. Basic abuse guard: rate-limit by email/IP via recent intent count; slot hold still limits damage.
- Account option: `supabase.auth.signUp` client-side before calling startBooking, then pass session.
- Confirmation polling: new public fn keyed by intent id + Stripe checkout session id (both required) instead of user id; `finalizeMyPaidBooking` same.
- Manage page: public route `/booking/manage/$token`; server fns `getBookingByToken`, `cancelByToken`, `rescheduleByToken`, `saveNoteByToken` reuse existing cancellation/reschedule/refund logic, verifying token server-side via admin client. Token expires after session end.
- Emails: add manage URL prop to booking-confirmation, booking-rescheduled, booking-cancelled templates.
- Backfill in `getMyClientData` extended to `booking_intents` by email.
- Therapist dashboard unchanged (already uses client_email/name).
