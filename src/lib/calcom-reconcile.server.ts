/**
 * Self-healing sync for changes made directly on Cal.com.
 *
 * Veyro normally learns about a reschedule or cancellation from the Cal.com
 * webhook. When that notification never arrives (webhook registered before the
 * BOOKING_RESCHEDULED trigger existed, or registration silently failed at
 * connect time), the stored appointment keeps the old time forever. This module
 * re-asks Cal.com what the live booking is for each upcoming appointment and
 * repairs the row, so a missed webhook heals on the next dashboard load.
 */

const MAX_ROWS = 25;
const THROTTLE_MS = 60_000;
const WEBHOOK_URL = "https://www.veyrohealth.com/api/public/calcom/webhook";

const lastRun = new Map<string, number>();

function sameInstant(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

/**
 * Bring a therapist's upcoming appointments back in line with Cal.com.
 * Never throws — a failure here must not block the dashboard.
 */
export async function reconcileTherapistAppointments(therapistId: string): Promise<void> {
  const now = Date.now();
  const previous = lastRun.get(therapistId) ?? 0;
  if (now - previous < THROTTLE_MS) return;
  lastRun.set(therapistId, now);

  try {
    const { getCalcomCredentialsByTherapist } = await import("@/lib/calcom-sync.server");
    const credentials = await getCalcomCredentialsByTherapist(therapistId);
    if (!credentials?.bearer) return;

    // Keep the therapist's Cal.com account subscribed to cancellation and
    // reschedule notifications. Idempotent, and failures are swallowed inside.
    const secret = process.env["CALCOM_WEBHOOK_SECRET"];
    if (secret) {
      const { ensureCancellationWebhook } = await import("@/lib/calcom.server");
      await ensureCancellationWebhook(credentials.bearer, WEBHOOK_URL, secret).catch(
        () => undefined,
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("appointments")
      .select("id, starts_at, ends_at, meeting_url, calcom_booking_uid, client_email, status")
      .eq("therapist_id", therapistId)
      .eq("status", "confirmed")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(MAX_ROWS);

    if (!rows?.length) return;

    const { findLiveBookingForUid } = await import("@/lib/calcom.server");

    for (const row of rows) {
      if (!row.calcom_booking_uid || !row.client_email) continue;
      try {
        const live = await findLiveBookingForUid(
          credentials.bearer,
          row.calcom_booking_uid,
          row.client_email,
        );

        if (!live) {
          // Cal.com has no live booking left in the chain: it was cancelled
          // there and Veyro never heard about it.
          await supabaseAdmin
            .from("appointments")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", row.id);
          try {
            const { sendBookingCancellationForAppointment } =
              await import("@/lib/send-booking-cancellation.server");
            await sendBookingCancellationForAppointment(row.id, null);
          } catch (err) {
            console.error("[calcom:reconcile] cancellation email failed", err);
          }
          continue;
        }

        const moved = !sameInstant(live.start, row.starts_at);
        const uidChanged = live.uid !== row.calcom_booking_uid;
        const urlChanged = Boolean(live.meetingUrl) && live.meetingUrl !== row.meeting_url;
        if (!moved && !uidChanged && !urlChanged) continue;

        const previousStartsAt = row.starts_at;
        const previousEndsAt = row.ends_at;

        await supabaseAdmin
          .from("appointments")
          .update({
            ...(live.start ? { starts_at: new Date(live.start).toISOString() } : {}),
            ...(live.end ? { ends_at: new Date(live.end).toISOString() } : {}),
            ...(uidChanged ? { calcom_booking_uid: live.uid } : {}),
            ...(urlChanged ? { meeting_url: live.meetingUrl } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (moved) {
          try {
            const { sendBookingRescheduleForAppointment } =
              await import("@/lib/send-booking-reschedule.server");
            // De-duplicated per appointment + new start time, so this stays
            // silent when the webhook already sent the notice.
            await sendBookingRescheduleForAppointment(row.id, {
              previousStartsAt,
              previousEndsAt,
              rescheduleReason: null,
            });
          } catch (err) {
            console.error("[calcom:reconcile] reschedule email failed", err);
          }
        }
      } catch (err) {
        console.error("[calcom:reconcile] appointment failed", row.id, err);
      }
    }
  } catch (err) {
    console.error("[calcom:reconcile] failed", therapistId, err);
  }
}
