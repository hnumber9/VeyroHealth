import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function safeThrow(scope: string, err: unknown, userMessage: string): never {
  console.error(`[therapist-services:${scope}]`, err);
  throw new Error(userMessage);
}

const serviceInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Give the session a name").max(120),
  description: z.string().trim().max(600).optional().nullable(),
  duration_minutes: z
    .number()
    .int()
    .min(10, "Sessions must be at least 10 minutes")
    .max(480, "Sessions can't be longer than 8 hours"),
  price_cents: z.number().int().min(0, "Price can't be negative").max(500000),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const listMyServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("therapist_services")
      .select("*")
      .eq("user_id", context.userId)
      .order("sort_order", { ascending: true })
      .order("duration_minutes", { ascending: true });
    if (error) safeThrow("list", error, "Couldn't load your sessions.");
    return { services: data ?? [] };
  });

export const upsertMyService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const result = serviceInputSchema.safeParse(input);
    if (!result.success) {
      throw new Error(
        result.error.issues.map((i) => i.message).join(" ") || "Please check the form.",
      );
    }
    return result.data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileError } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) safeThrow("profile", profileError, "Couldn't load your profile.");
    if (!profile) throw new Error("Complete your profile before adding sessions.");

    const row = {
      therapist_id: profile.id,
      user_id: userId,
      name: data.name,
      description: data.description ?? null,
      duration_minutes: data.duration_minutes,
      price_cents: data.price_cents,
      currency: "GBP",
      active: data.active,
      sort_order: data.sort_order,
    };

    const query = data.id
      ? supabase
          .from("therapist_services")
          .update(row)
          .eq("id", data.id)
          .eq("user_id", userId)
          .select("*")
          .single()
      : supabase.from("therapist_services").insert(row).select("*").single();

    const { data: saved, error } = await query;
    if (error) safeThrow("upsert", error, "Couldn't save that session.");

    // Keep Cal.com in step so availability can be queried per duration.
    try {
      const { syncServiceEventType } = await import("@/lib/calcom-sync.server");
      await syncServiceEventType(userId, saved.id);
    } catch (error) {
      console.error("[therapist-services:calcom-sync]", error);
    }

    return { service: saved };
  });

export const deleteMyService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: service } = await supabase
      .from("therapist_services")
      .select("calcom_event_type_id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();

    const { error } = await supabase
      .from("therapist_services")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) safeThrow("delete", error, "Couldn't remove that session.");

    if (service?.calcom_event_type_id) {
      try {
        const { removeServiceEventType } = await import("@/lib/calcom-sync.server");
        await removeServiceEventType(userId, service.calcom_event_type_id);
      } catch (error) {
        console.error("[therapist-services:calcom-delete]", error);
      }
    }

    return { ok: true };
  });

/** Public: active services for a published therapist's profile page. */
export const listPublicServices = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ therapistId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createPublicSupabase } = await import("@/lib/supabase-public.server");
    const supabase = createPublicSupabase();
    const { data: services, error } = await supabase
      .from("therapist_services")
      .select("id, name, description, duration_minutes, price_cents, currency")
      .eq("therapist_id", data.therapistId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("duration_minutes", { ascending: true });
    if (error) {
      console.error("[therapist-services:public]", error);
      return { services: [] };
    }
    return { services: services ?? [] };
  });
