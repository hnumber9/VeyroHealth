import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Pull the therapist's existing Cal.com event types (e.g. their 15 min and
 * 30 min meetings) so they can price them inside Veyro.
 */
export const listCalcomEventTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ nonce: z.union([z.string(), z.number()]).optional() })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ context }) => {
    const { getCalcomCredentials } = await import("@/lib/calcom-sync.server");
    const credentials = await getCalcomCredentials(context.userId);
    if (!credentials)
      return { connected: false, eventTypes: [] as EventTypeOption[], warnings: [] as string[] };

    const { listEventTypes } = await import("@/lib/calcom.server");
    let raw: Awaited<ReturnType<typeof listEventTypes>> = [];
    try {
      raw = await listEventTypes(credentials.bearer, credentials.calcom_username ?? "");
    } catch (error) {
      console.error("[calcom-services:list]", error);
      return {
        connected: true,
        eventTypes: [] as EventTypeOption[],
        warnings: ["We couldn't reach Cal.com just now — try Refresh again in a moment."],
      };
    }

    const { data: existing } = await context.supabase
      .from("therapist_services")
      .select("id, calcom_event_type_id, price_cents, name, duration_minutes, active")
      .eq("user_id", context.userId);
    const priced = new Map<
      number,
      { id: string; price_cents: number; name: string; duration_minutes: number; active: boolean }
    >();
    for (const s of existing ?? []) {
      if (s.calcom_event_type_id != null) priced.set(Number(s.calcom_event_type_id), s);
    }

    // De-duplicate by Cal.com id (the API can repeat entries across profiles)
    // and order by duration, then title, so the list is stable on refresh.
    const byId = new Map<number, (typeof raw)[number]>();
    for (const et of Array.isArray(raw) ? raw : []) {
      if (!byId.has(et.id)) byId.set(et.id, et);
    }

    const eventTypes: EventTypeOption[] = [...byId.values()]
      .map((et) => ({
        id: et.id,
        title: et.title,
        slug: et.slug,
        duration_minutes: et.lengthInMinutes ?? et.length ?? 0,
        hidden: Boolean(et.hidden),
        imported: priced.has(et.id),
        price_cents: priced.get(et.id)?.price_cents ?? null,
      }))
      .sort((a, b) => a.duration_minutes - b.duration_minutes || a.title.localeCompare(b.title));

    const warnings: string[] = [];

    // Keep priced sessions in step with Cal.com: names/lengths follow Cal.com,
    // and anything deleted or hidden there stops being bookable on Veyro.
    for (const et of eventTypes) {
      const service = priced.get(et.id);
      if (!service) continue;
      const shouldBeActive = !et.hidden && et.duration_minutes > 0;
      const patch: {
        name?: string;
        duration_minutes?: number;
        sort_order?: number;
        active?: boolean;
      } = {};
      if (service.name !== et.title) patch.name = et.title;
      if (service.duration_minutes !== et.duration_minutes && et.duration_minutes > 0) {
        patch.duration_minutes = et.duration_minutes;
        patch.sort_order = et.duration_minutes;
      }
      if (service.active !== shouldBeActive) patch.active = shouldBeActive;
      if (Object.keys(patch).length) {
        await context.supabase
          .from("therapist_services")
          .update(patch)
          .eq("id", service.id)
          .eq("user_id", context.userId);
      }
      if (et.hidden) warnings.push(`“${et.title}” is hidden in Cal.com, so clients can't book it.`);
    }

    // Priced sessions whose Cal.com meeting no longer exists.
    for (const [eventTypeId, service] of priced) {
      if (byId.has(eventTypeId)) continue;
      if (service.active) {
        await context.supabase
          .from("therapist_services")
          .update({ active: false })
          .eq("id", service.id)
          .eq("user_id", context.userId);
      }
      warnings.push(`“${service.name}” no longer exists in Cal.com, so it's no longer bookable.`);
    }

    // Same-length meetings are confusing for clients when both are priced.
    const seenDuration = new Map<number, string>();
    for (const et of eventTypes) {
      if (!et.imported || !et.duration_minutes) continue;
      const first = seenDuration.get(et.duration_minutes);
      if (first) {
        warnings.push(
          `“${first}” and “${et.title}” are both ${et.duration_minutes} min — clients will see two identical options.`,
        );
      } else {
        seenDuration.set(et.duration_minutes, et.title);
      }
    }

    return { connected: true, eventTypes, warnings };
  });

export type EventTypeOption = {
  id: number;
  title: string;
  slug: string;
  duration_minutes: number;
  hidden: boolean;
  imported: boolean;
  price_cents: number | null;
};

/** Turn a Cal.com event type into a priced, bookable Veyro session. */
export const importCalcomEventType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventTypeId: z.number().int().positive(),
        priceCents: z.number().int().min(0).max(500000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Complete your profile before adding sessions.");

    const { getCalcomCredentials } = await import("@/lib/calcom-sync.server");
    const credentials = await getCalcomCredentials(userId);
    if (!credentials) throw new Error("Connect your Cal.com calendar first.");

    const { listEventTypes } = await import("@/lib/calcom.server");
    const all = await listEventTypes(credentials.bearer, credentials.calcom_username ?? "");
    const match = (Array.isArray(all) ? all : []).find((et) => et.id === data.eventTypeId);
    if (!match) throw new Error("We couldn't find that meeting type on your Cal.com account.");

    const duration = match.lengthInMinutes ?? match.length ?? 0;
    if (!duration) throw new Error("That meeting type has no length set in Cal.com.");

    const { data: existing } = await supabase
      .from("therapist_services")
      .select("id")
      .eq("user_id", userId)
      .eq("calcom_event_type_id", data.eventTypeId)
      .maybeSingle();

    const row = {
      therapist_id: profile.id,
      user_id: userId,
      name: match.title,
      duration_minutes: duration,
      price_cents: data.priceCents,
      currency: "GBP",
      active: true,
      sort_order: duration,
      calcom_event_type_id: data.eventTypeId,
      calcom_event_type_slug: match.slug,
    };

    const { data: saved, error } = existing
      ? await supabase
          .from("therapist_services")
          .update(row)
          .eq("id", existing.id)
          .eq("user_id", userId)
          .select("*")
          .single()
      : await supabase.from("therapist_services").insert(row).select("*").single();

    if (error) {
      console.error("[calcom-services:import]", error);
      throw new Error("Couldn't save that session.");
    }

    return { service: saved };
  });
