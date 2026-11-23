import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TRAIT_SET } from "@/lib/therapist-traits";

const submitSchema = z.object({
  therapist_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional().nullable(),
  traits: z.array(z.string().trim()).max(60).default([]),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const traits = Array.from(new Set(data.traits.filter((t) => TRAIT_SET.has(t))));
    // Only patients who have had an appointment with this therapist may review.
    const { data: appt } = await supabase
      .from("appointments")
      .select("id")
      .eq("client_user_id", userId)
      .eq("therapist_id", data.therapist_id)
      .limit(1)
      .maybeSingle();
    if (!appt) throw new Error("You can only review therapists you've had a session with.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ownTp } = await supabaseAdmin
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (ownTp) throw new Error("Therapist accounts can't leave reviews.");
    const { data: row, error } = await supabaseAdmin
      .from("therapist_reviews")
      .upsert(
        {
          therapist_id: data.therapist_id,
          client_user_id: userId,
          rating: data.rating,
          body: data.body ?? null,
          traits,
        } as never,
        { onConflict: "therapist_id,client_user_id" },
      )
      .select()
      .single();
    if (error) {
      console.error("submitReview failed", error);
      throw new Error("Sorry, we couldn't save your review. Please try again.");
    }
    return { review: row };
  });

const slugInput = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,60}$/),
});

export const getTherapistReviews = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tp } = await supabaseAdmin
      .from("therapist_profiles")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!tp) return { reviews: [], traitCounts: {}, avg: 0, count: 0 };
    const { data: reviews } = await supabaseAdmin
      .from("therapist_reviews")
      .select("id, rating, body, traits, created_at, client_user_id")
      .eq("therapist_id", tp.id)
      .order("created_at", { ascending: false });
    const list = reviews ?? [];
    const traitCounts: Record<string, number> = {};
    let sum = 0;
    for (const r of list) {
      sum += r.rating;
      for (const t of (r.traits ?? []) as string[]) {
        traitCounts[t] = (traitCounts[t] ?? 0) + 1;
      }
    }
    // Strip user ids before returning
    const safe = list.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      traits: r.traits,
      created_at: r.created_at,
    }));
    return {
      reviews: safe,
      traitCounts,
      avg: list.length ? sum / list.length : 0,
      count: list.length,
    };
  });

// For client dashboard: list therapists the client has had appointments with + their existing review if any
export const getMyReviewableTherapists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: appts } = await supabase
      .from("appointments")
      .select("therapist_id")
      .eq("client_user_id", userId);
    const ids = Array.from(new Set((appts ?? []).map((a) => a.therapist_id)));
    if (!ids.length) return { therapists: [], reviews: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tps } = await supabaseAdmin
      .from("therapist_profiles")
      .select("id, display_name, slug, photo_url")
      .in("id", ids);
    const { data: reviews } = await supabase
      .from("therapist_reviews")
      .select("id, therapist_id, rating, body, traits")
      .eq("client_user_id", userId)
      .in("therapist_id", ids);
    return { therapists: tps ?? [], reviews: reviews ?? [] };
  });

// For the therapist dashboard: return reviews for the signed-in therapist's own profile.
export const getMyReviewsAsTherapist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: tp } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!tp) return { reviews: [], traitCounts: {}, avg: 0, count: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reviews } = await supabaseAdmin
      .from("therapist_reviews")
      .select("id, rating, body, traits, created_at")
      .eq("therapist_id", tp.id)
      .order("created_at", { ascending: false });
    const list = reviews ?? [];
    const traitCounts: Record<string, number> = {};
    let sum = 0;
    for (const r of list) {
      sum += r.rating;
      for (const t of (r.traits ?? []) as string[]) {
        traitCounts[t] = (traitCounts[t] ?? 0) + 1;
      }
    }
    return {
      reviews: list.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        traits: r.traits,
        created_at: r.created_at,
      })),
      traitCounts,
      avg: list.length ? sum / list.length : 0,
      count: list.length,
    };
  });
