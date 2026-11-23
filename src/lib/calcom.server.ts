import { autoBookingFieldResponses, missingRequiredBookingFields } from "./calcom-booking-fields";
/**
 * Cal.com API v2 client.
 *
 * Uses the therapist's own personal API key (free plan). Veyro never holds a
 * Cal.com OAuth client — the therapist connects Google/Microsoft inside
 * Cal.com, so conferencing links come from their own calendar connection.
 */

const CALCOM_BASE = "https://api.cal.com/v2";
const SLOTS_API_VERSION = "2024-09-04";
const EVENT_TYPES_API_VERSION = "2024-06-14";
const BOOKINGS_API_VERSION = "2024-08-13";
const RESCHEDULE_API_VERSION = "2026-02-25";

export class CalcomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CalcomError";
    this.status = status;
  }
}

type CalcomRequest = {
  apiKey: string;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  apiVersion?: string;
  query?: Record<string, string | number | undefined>;
};

async function calcom<T>({
  apiKey,
  path,
  method = "GET",
  body,
  apiVersion,
  query,
}: CalcomRequest): Promise<T> {
  const url = new URL(`${CALCOM_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (apiVersion) headers["cal-api-version"] = apiVersion;

  const res = await fetch(url.toString(), {
    method,
    headers,
    cache: "no-store",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    const detail =
      (parsed as { error?: { message?: string }; message?: string })?.error?.message ??
      (parsed as { message?: string })?.message ??
      text.slice(0, 300);
    console.error(`Cal.com ${method} ${path} failed [${res.status}]: ${text.slice(0, 500)}`);
    throw new CalcomError(detail || `Cal.com request failed (${res.status})`, res.status);
  }

  return (parsed as { data?: T }).data ?? (parsed as T);
}

/** Verify an API key and return the Cal.com profile it belongs to. */
export async function getCalcomMe(apiKey: string) {
  const me = await calcom<{
    id: number;
    email: string;
    username: string;
    name?: string;
    timeZone?: string;
  }>({ apiKey, path: "/me" });
  return me;
}

/** All event types owned by the authenticated Cal.com user. */
export async function listEventTypes(apiKey: string, username: string) {
  return calcom<
    Array<{
      id: number;
      slug: string;
      title: string;
      lengthInMinutes?: number;
      length?: number;
      hidden?: boolean;
      scheduleId?: number | null;
    }>
  >({
    apiKey,
    path: "/event-types",
    apiVersion: EVENT_TYPES_API_VERSION,
    query: { username, _ts: Date.now() },
  });
}

export async function createEventType(
  apiKey: string,
  input: { title: string; slug: string; lengthInMinutes: number; description?: string },
) {
  return calcom<{ id: number; slug: string }>({
    apiKey,
    path: "/event-types",
    method: "POST",
    apiVersion: EVENT_TYPES_API_VERSION,
    body: {
      title: input.title,
      slug: input.slug,
      lengthInMinutes: input.lengthInMinutes,
      ...(input.description ? { description: input.description } : {}),
    },
  });
}

export async function updateEventType(
  apiKey: string,
  eventTypeId: number,
  input: { title?: string; lengthInMinutes?: number; description?: string },
) {
  return calcom<{ id: number; slug: string }>({
    apiKey,
    path: `/event-types/${eventTypeId}`,
    method: "PATCH",
    apiVersion: EVENT_TYPES_API_VERSION,
    body: input,
  });
}

export async function deleteEventType(apiKey: string, eventTypeId: number) {
  return calcom<unknown>({
    apiKey,
    path: `/event-types/${eventTypeId}`,
    method: "DELETE",
    apiVersion: EVENT_TYPES_API_VERSION,
  });
}

/**
 * Available slots for an event type. Cal.com returns either an array of
 * { start } objects keyed by date, or a flat array depending on format.
 */
export async function getAvailableSlots(
  apiKey: string,
  input: { eventTypeId: number; start: string; end: string; timeZone?: string },
): Promise<string[]> {
  const data = await calcom<Record<string, Array<{ start: string }>> | Array<{ start: string }>>({
    apiKey,
    path: "/slots",
    apiVersion: SLOTS_API_VERSION,
    query: {
      eventTypeId: input.eventTypeId,
      start: input.start,
      end: input.end,
      timeZone: input.timeZone,
    },
  });

  if (Array.isArray(data)) return data.map((s) => s.start);

  const out: string[] = [];
  for (const slots of Object.values(data ?? {})) {
    if (Array.isArray(slots)) {
      for (const slot of slots) if (slot?.start) out.push(slot.start);
    }
  }
  return out.sort();
}

/**
 * Reserve (hold) a slot so nobody else can book it while payment is taken.
 * `reservationDuration` is in minutes and only honoured for API-key auth.
 */
export async function reserveSlot(
  apiKey: string,
  input: {
    eventTypeId: number;
    slotStart: string;
    slotDurationMinutes?: number;
    reservationDurationMinutes: number;
  },
) {
  const reservation = await calcom<{
    reservationUid: string;
    reservationUntil?: string;
    slotStart?: string;
  }>({
    apiKey,
    path: "/slots/reservations",
    method: "POST",
    apiVersion: SLOTS_API_VERSION,
    body: {
      eventTypeId: input.eventTypeId,
      slotStart: input.slotStart,
      reservationDuration: input.reservationDurationMinutes,
    },
  });

  return {
    uid: reservation.reservationUid,
    reservationUntil: reservation.reservationUntil,
    slotStart: reservation.slotStart,
  };
}

export async function getReservedSlot(apiKey: string, uid: string) {
  return calcom<{ uid: string; reservationUntil?: string; slotStart?: string }>({
    apiKey,
    path: `/slots/reservations/${uid}`,
    apiVersion: SLOTS_API_VERSION,
  });
}

export async function releaseReservedSlot(apiKey: string, uid: string) {
  try {
    await calcom<unknown>({
      apiKey,
      path: `/slots/reservations/${uid}`,
      method: "DELETE",
      apiVersion: SLOTS_API_VERSION,
    });
  } catch (error) {
    // A hold that already expired is not an error worth surfacing.
    console.warn("Cal.com release reservation failed (likely already expired):", error);
  }
}

/** Turn a held slot into a real booking. */
export async function createBooking(
  apiKey: string,
  input: {
    eventTypeId: number;
    start: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeeTimeZone: string;
    lengthInMinutes?: number;
    reservationUid?: string;
    sessionTitle?: string;
    metadata?: Record<string, string>;
  },
) {
  type BookingResult = {
    uid: string;
    meetingUrl?: string;
    location?: string;
    start: string;
    end: string;
    hosts?: Array<{ name?: string; email?: string }>;
  };

  const send = (withLength: boolean, responses: Record<string, string>) =>
    calcom<BookingResult>({
      apiKey,
      path: "/bookings",
      method: "POST",
      apiVersion: BOOKINGS_API_VERSION,
      body: {
        start: input.start,
        eventTypeId: input.eventTypeId,
        ...(withLength && input.lengthInMinutes ? { lengthInMinutes: input.lengthInMinutes } : {}),
        attendee: {
          name: input.attendeeName,
          email: input.attendeeEmail,
          timeZone: input.attendeeTimeZone,
          language: "en",
        },
        ...(Object.keys(responses).length ? { bookingFieldsResponses: responses } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        // Cal.com rejects reservationUid on this endpoint; the caller releases
        // the hold right before booking instead.
      },
    });

  // Adapt to the event type's settings: fixed-length types reject
  // lengthInMinutes, and required booking questions (e.g. "title") must be
  // answered. Each adjustment is made once, so this tries at most 3 times.
  let withLength = true;
  let responses: Record<string, string> = {};
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await send(withLength, responses);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= 2) throw error;
      if (withLength && /lengthInMinutes/i.test(message)) {
        withLength = false;
        continue;
      }
      const extra = autoBookingFieldResponses(
        missingRequiredBookingFields(message).filter((f) => !(f in responses)),
        input.sessionTitle ?? "Therapy session booked via Veyro",
      );
      if (Object.keys(extra).length) {
        responses = { ...responses, ...extra };
        continue;
      }
      throw error;
    }
  }
}

/** Move an existing booking to a new start time (no new payment). */
export async function rescheduleBooking(
  apiKey: string,
  uid: string,
  input: { start: string; reason?: string },
) {
  let currentUid = uid;
  for (let hop = 0; hop < 10; hop += 1) {
    try {
      return await calcom<{
        uid: string;
        start: string;
        end: string;
        meetingUrl?: string;
        location?: string;
      }>({
        apiKey,
        path: `/bookings/${currentUid}/reschedule`,
        method: "POST",
        apiVersion: RESCHEDULE_API_VERSION,
        body: {
          start: input.start,
          reschedulingReason: input.reason ?? "Rescheduled via Veyro",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const replacementUid = message.match(
        /rescheduled[^\n]*?(?:uid\s*[=:]?\s*)([A-Za-z0-9_-]+)/i,
      )?.[1];
      if (!replacementUid || replacementUid === currentUid) throw error;
      currentUid = replacementUid;
    }
  }
  throw new CalcomError("Could not resolve the current Cal.com booking.", 409);
}

export async function cancelBooking(apiKey: string, uid: string, reason?: string) {
  return calcom<unknown>({
    apiKey,
    path: `/bookings/${uid}/cancel`,
    method: "POST",
    apiVersion: BOOKINGS_API_VERSION,
    body: { cancellationReason: reason ?? "Cancelled via Veyro" },
  });
}

/**
 * Rescheduling in Cal.com cancels the old booking and creates a new one with a
 * new uid. If Veyro missed that new uid (webhook lost, request failed after
 * Cal.com committed), the stored uid points at a cancelled booking and every
 * later reschedule fails. Follow the rescheduledFromUid chain to find the
 * booking that is actually live for this attendee.
 */
export async function findLiveBookingForUid(
  apiKey: string,
  uid: string,
  attendeeEmail: string,
): Promise<{
  uid: string;
  start: string;
  end: string;
  meetingUrl?: string;
  location?: string;
} | null> {
  type Row = {
    uid?: string;
    start?: string;
    end?: string;
    status?: string;
    rescheduledFromUid?: string | null;
    rescheduledToUid?: string | null;
    meetingUrl?: string;
    location?: string;
  };

  // The cancelled booking itself is the authoritative place Cal.com stores
  // rescheduledToUid. Following that direct chain is more reliable than the
  // filtered bookings list, which can omit replacement bookings.
  let currentUid = uid;
  for (let hop = 0; hop < 10; hop += 1) {
    const row = await calcom<Row>({
      apiKey,
      path: `/bookings/${currentUid}`,
      apiVersion: BOOKINGS_API_VERSION,
    });
    const status = row.status?.toLowerCase();
    if (row.uid && status !== "cancelled" && status !== "rejected") {
      return {
        uid: row.uid,
        start: row.start ?? "",
        end: row.end ?? "",
        ...(row.meetingUrl ? { meetingUrl: row.meetingUrl } : {}),
        ...(row.location ? { location: row.location } : {}),
      };
    }
    if (!row.rescheduledToUid || row.rescheduledToUid === currentUid) break;
    currentUid = row.rescheduledToUid;
  }

  // Backward-compatible fallback for older Cal.com records where the direct
  // booking response does not expose rescheduledToUid.
  const [upcomingRows, cancelledRows] = await Promise.all([
    calcom<Row[]>({
      apiKey,
      path: "/bookings",
      apiVersion: BOOKINGS_API_VERSION,
      query: { status: "upcoming", take: 100, attendeeEmail },
    }),
    calcom<Row[]>({
      apiKey,
      path: "/bookings",
      apiVersion: BOOKINGS_API_VERSION,
      query: { status: "cancelled", take: 100, attendeeEmail },
    }),
  ]);
  const rows = [
    ...(Array.isArray(upcomingRows) ? upcomingRows : []),
    ...(Array.isArray(cancelledRows) ? cancelledRows : []),
  ];

  const byPrevious = new Map<string, Row>();
  for (const row of rows) {
    if (row.rescheduledFromUid && row.uid) byPrevious.set(row.rescheduledFromUid, row);
  }

  let current = uid;
  for (let hop = 0; hop < 10; hop += 1) {
    const next = byPrevious.get(current);
    if (!next?.uid) break;
    current = next.uid;
    if (next.status === "accepted" || next.status === "pending") {
      return {
        uid: next.uid,
        start: next.start ?? "",
        end: next.end ?? "",
        ...(next.meetingUrl ? { meetingUrl: next.meetingUrl } : {}),
        ...(next.location ? { location: next.location } : {}),
      };
    }
  }
  return null;
}

/**
 * Make sure the therapist's Cal.com account posts cancellation events to Veyro,
 * so both sides get a Veyro-branded cancellation email. Idempotent: an existing
 * webhook pointing at the same URL is reused.
 */
export async function ensureCancellationWebhook(
  apiKey: string,
  subscriberUrl: string,
  secret: string,
) {
  const triggers = ["BOOKING_CANCELLED", "BOOKING_REJECTED", "BOOKING_RESCHEDULED"];
  try {
    const existing = await calcom<Array<{ id?: number; subscriberUrl?: string }>>({
      apiKey,
      path: "/webhooks",
    });
    const match = Array.isArray(existing)
      ? existing.find((w) => w.subscriberUrl === subscriberUrl)
      : null;
    if (match?.id) {
      await calcom<unknown>({
        apiKey,
        path: `/webhooks/${match.id}`,
        method: "PATCH",
        body: { active: true, triggers, secret },
      });
      return match.id;
    }

    const created = await calcom<{ id?: number }>({
      apiKey,
      path: "/webhooks",
      method: "POST",
      body: { active: true, subscriberUrl, triggers, secret, payloadTemplate: null },
    });
    return created?.id ?? null;
  } catch (error) {
    // A missing webhook must never block connecting a calendar.
    console.error("[calcom:ensure-webhook]", error);
    return null;
  }
}

/** Slug-safe identifier for a Veyro service's Cal.com event type. */
export function serviceEventSlug(serviceId: string, durationMinutes: number) {
  return `veyro-${durationMinutes}min-${serviceId.slice(0, 8)}`;
}
