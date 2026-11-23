import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CALENDLY_API_BASE, refreshTokens, expiresAtFromNow } from "@/lib/calendly.server";

interface ScheduledEvent {
  uri: string;
  start_time: string;
  end_time: string;
  status: string;
  location?: { type?: string; join_url?: string; location?: string } | null;
}

interface Invitee {
  uri: string;
  email: string;
  name?: string | null;
  status?: string;
  cancel_url?: string;
  created_at?: string;
}

interface Connection {
  therapist_id: string;
  user_id: string;
  calendly_user_uri: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
}

async function getFreshAccessToken(conn: Connection): Promise<string> {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  // Refresh if expiring within the next 60s
  if (expiresAt - Date.now() > 60_000) return conn.access_token;
  try {
    const t = await refreshTokens(conn.refresh_token);
    await supabaseAdmin
      .from("calendly_connections")
      .update({
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        token_expires_at: expiresAtFromNow(t.expires_in),
      })
      .eq("user_id", conn.user_id);
    return t.access_token;
  } catch (e) {
    console.error("[calendly-sync] token refresh failed:", e);
    return conn.access_token;
  }
}

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[calendly-sync] ${url} failed [${res.status}]: ${body}`);
    return null;
  }
  return (await res.json()) as T;
}

interface AppointmentRow {
  therapist_id: string;
  client_email: string;
  client_name: string | null;
  client_user_id: string | null;
  starts_at: string;
  ends_at: string;
  meeting_url: string | null;
  status: string;
  calendly_event_uri: string;
  calendly_invitee_uri: string;
}

// The unique index on calendly_invitee_uri is partial (WHERE ... IS NOT NULL),
// which Postgres won't use for ON CONFLICT — so supabase.upsert() silently
// fails. Emulate upsert with an explicit lookup + update/insert.
async function upsertAppointmentByInvitee(
  row: AppointmentRow,
): Promise<{ id: string; created: boolean } | null> {
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("appointments")
    .select("id")
    .eq("calendly_invitee_uri", row.calendly_invitee_uri)
    .maybeSingle();
  if (findErr) {
    console.error("[calendly-sync] appointment lookup failed:", findErr);
    return null;
  }
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update(row)
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();
    if (error) console.error("[calendly-sync] appointment update failed:", error);
    return { id: data?.id ?? existing.id, created: false };
  }
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert(row)
    .select("id")
    .maybeSingle();
  if (error) console.error("[calendly-sync] appointment insert failed:", error);
  return data ? { id: data.id, created: true } : null;
}

// Free Calendly plans can't create webhook subscriptions, so the sync path is
// the only thing that ever sees the booking. Email from here too — but only for
// rows this sync just created, for a live future session that was booked very
// recently, so historic backfill (including bookings made outside Veyro) stays
// silent. Insert-only means repeated syncs can't send twice.
const RECENT_BOOKING_WINDOW_MS = 2 * 60 * 60 * 1000;

async function maybeSendConfirmation(params: {
  upserted: { id: string; created: boolean } | null;
  isCanceled: boolean;
  startsAt: string;
  inviteeCreatedAt?: string;
}): Promise<void> {
  const { upserted, isCanceled, startsAt, inviteeCreatedAt } = params;
  if (!upserted?.created || isCanceled) return;
  if (new Date(startsAt).getTime() <= Date.now()) return;
  if (!inviteeCreatedAt) return;
  const bookedAt = new Date(inviteeCreatedAt).getTime();
  if (!Number.isFinite(bookedAt) || Date.now() - bookedAt > RECENT_BOOKING_WINDOW_MS) return;
  try {
    const { sendBookingConfirmationForAppointment } =
      await import("@/lib/send-booking-confirmation.server");
    await sendBookingConfirmationForAppointment(upserted.id);
  } catch (e) {
    console.error("[calendly-sync] booking confirmation send failed:", e);
  }
}

async function syncForConnection(
  conn: Connection,
  inviteeEmail: string,
  clientUserId: string | null,
) {
  const token = await getFreshAccessToken(conn);
  const minStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(`${CALENDLY_API_BASE}/scheduled_events`);
  url.searchParams.set("user", conn.calendly_user_uri);
  url.searchParams.set("invitee_email", inviteeEmail);
  url.searchParams.set("min_start_time", minStart);
  url.searchParams.set("count", "50");
  url.searchParams.set("sort", "start_time:asc");

  const events = await fetchJson<{ collection: ScheduledEvent[] }>(url.toString(), token);
  if (!events?.collection?.length) return;

  for (const ev of events.collection) {
    const uuid = ev.uri.split("/").pop();
    if (!uuid) continue;
    const invUrl = `${CALENDLY_API_BASE}/scheduled_events/${uuid}/invitees?email=${encodeURIComponent(inviteeEmail)}`;
    const invRes = await fetchJson<{ collection: Invitee[] }>(invUrl, token);
    const invitee = invRes?.collection?.[0];
    if (!invitee) continue;

    const isCanceled =
      (ev.status && ev.status !== "active") || (invitee.status && invitee.status === "canceled");

    const resolvedClientUserId =
      clientUserId ??
      (
        await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", inviteeEmail)
          .maybeSingle()
      ).data?.user_id ??
      null;

    const { data: existingLink } = await supabaseAdmin
      .from("therapist_clients")
      .select("id")
      .eq("therapist_id", conn.therapist_id)
      .eq("client_email", inviteeEmail)
      .maybeSingle();

    if (!existingLink) {
      await supabaseAdmin.from("therapist_clients").insert({
        therapist_id: conn.therapist_id,
        client_email: inviteeEmail,
        client_user_id: resolvedClientUserId,
        linked_via: "calendly",
      });
    } else if (resolvedClientUserId) {
      await supabaseAdmin
        .from("therapist_clients")
        .update({ client_user_id: resolvedClientUserId })
        .eq("id", existingLink.id);
    }

    const upserted = await upsertAppointmentByInvitee({
      therapist_id: conn.therapist_id,
      client_email: inviteeEmail,
      client_name: invitee.name ?? null,
      client_user_id: resolvedClientUserId,
      starts_at: ev.start_time,
      ends_at: ev.end_time,
      meeting_url: ev.location?.join_url ?? null,
      status: isCanceled ? "cancelled" : "confirmed",
      calendly_event_uri: ev.uri,
      calendly_invitee_uri: invitee.uri,
    });

    await maybeSendConfirmation({
      upserted,
      isCanceled: Boolean(isCanceled),
      startsAt: ev.start_time,
      inviteeCreatedAt: invitee.created_at,
    });
  }
}

/**
 * Best-effort sync of a client's Calendly bookings across every connected
 * therapist. Ensures the client dashboard reflects appointments even when
 * the webhook never fired (e.g. subscription failed at OAuth time).
 */
export async function syncCalendlyAppointmentsForClient(
  email: string,
  clientUserId: string | null,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const { data: conns } = await supabaseAdmin
    .from("calendly_connections")
    .select(
      "therapist_id, user_id, calendly_user_uri, access_token, refresh_token, token_expires_at",
    );
  if (!conns?.length) return;

  await Promise.all(
    conns.map((c) =>
      syncForConnection(c as Connection, normalized, clientUserId).catch((e) => {
        console.error("[calendly-sync] connection sync failed:", e);
      }),
    ),
  );
}

/**
 * Sync all upcoming/recent bookings for one therapist (used by the therapist
 * dashboard so appointments appear even if the webhook subscription failed).
 */
export async function syncCalendlyAppointmentsForTherapist(therapistId: string): Promise<void> {
  const { data: conn } = await supabaseAdmin
    .from("calendly_connections")
    .select(
      "therapist_id, user_id, calendly_user_uri, access_token, refresh_token, token_expires_at",
    )
    .eq("therapist_id", therapistId)
    .maybeSingle();
  if (!conn) return;

  const c = conn as Connection;
  const token = await getFreshAccessToken(c);
  const minStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(`${CALENDLY_API_BASE}/scheduled_events`);
  url.searchParams.set("user", c.calendly_user_uri);
  url.searchParams.set("min_start_time", minStart);
  url.searchParams.set("count", "100");
  url.searchParams.set("sort", "start_time:asc");

  const events = await fetchJson<{ collection: ScheduledEvent[] }>(url.toString(), token);
  if (!events?.collection?.length) return;

  for (const ev of events.collection) {
    const uuid = ev.uri.split("/").pop();
    if (!uuid) continue;
    const invRes = await fetchJson<{ collection: Invitee[] }>(
      `${CALENDLY_API_BASE}/scheduled_events/${uuid}/invitees`,
      token,
    );
    const invitee = invRes?.collection?.[0];
    if (!invitee) continue;
    const inviteeEmail = invitee.email.toLowerCase();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", inviteeEmail)
      .maybeSingle();

    const isCanceled =
      (ev.status && ev.status !== "active") || (invitee.status && invitee.status === "canceled");

    const { data: existingLink } = await supabaseAdmin
      .from("therapist_clients")
      .select("id")
      .eq("therapist_id", c.therapist_id)
      .eq("client_email", inviteeEmail)
      .maybeSingle();

    if (!existingLink) {
      await supabaseAdmin.from("therapist_clients").insert({
        therapist_id: c.therapist_id,
        client_email: inviteeEmail,
        client_user_id: profile?.user_id ?? null,
        linked_via: "calendly",
      });
    } else if (profile?.user_id) {
      await supabaseAdmin
        .from("therapist_clients")
        .update({ client_user_id: profile.user_id })
        .eq("id", existingLink.id);
    }

    const upserted = await upsertAppointmentByInvitee({
      therapist_id: c.therapist_id,
      client_email: inviteeEmail,
      client_name: invitee.name ?? null,
      client_user_id: profile?.user_id ?? null,
      starts_at: ev.start_time,
      ends_at: ev.end_time,
      meeting_url: ev.location?.join_url ?? null,
      status: isCanceled ? "cancelled" : "confirmed",
      calendly_event_uri: ev.uri,
      calendly_invitee_uri: invitee.uri,
    });

    await maybeSendConfirmation({
      upserted,
      isCanceled: Boolean(isCanceled),
      startsAt: ev.start_time,
      inviteeCreatedAt: invitee.created_at,
    });
  }
}
