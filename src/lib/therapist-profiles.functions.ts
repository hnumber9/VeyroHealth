import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Log the raw provider/DB error server-side, but only surface a short generic
// message to callers so we don't leak schema/query details to browsers.
function safeThrow(scope: string, err: unknown, userMessage: string): never {
  console.error(`[therapist-profiles:${scope}]`, err);
  throw new Error(userMessage);
}

const testimonialSchema = z.object({
  quote: z.string().trim().min(1).max(1000),
  author: z.string().trim().max(120).optional().nullable(),
});

const upsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]{2,60}$/,
      "Slug must be 2-60 chars, lowercase letters, numbers and hyphens only",
    ),
  display_name: z.string().trim().min(1).max(120),
  title: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(4000).optional().nullable(),
  calendly_url: z
    .string()
    .trim()
    .max(500)
    .transform((v) => {
      if (!v) return v;
      let s = v.trim();
      // strip common prefixes users paste
      s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
      return `https://${s}`;
    })
    .refine((v) => !v || /^https:\/\/calendly\.com\/.+/i.test(v), {
      message: "That doesn't look like a Calendly link. It should look like calendly.com/your-name",
    })
    .optional()
    .nullable()
    .or(z.literal("")),
  photo_url: z.string().trim().url().max(800).optional().nullable().or(z.literal("")),
  years_in_practice: z.number().int().min(0).max(80).optional().nullable(),
  session_fee_50: z.number().int().min(0).max(10000).optional().nullable(),
  session_fee_80: z.number().int().min(0).max(10000).optional().nullable(),
  offers_intro_call: z.boolean().optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable().or(z.literal("")),

  specialties: z.array(z.string().trim().min(1).max(120)).max(60).optional().nullable(),
  languages: z.array(z.string().trim().min(1).max(60)).max(20).optional().nullable(),
  testimonials: z.array(testimonialSchema).max(20).optional().nullable(),
  approach: z.string().trim().max(4000).optional().nullable(),
  qualifications: z.string().trim().max(1000).optional().nullable(),
  modalities: z.array(z.string().trim().min(1).max(80)).max(20).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  intro_video_url: z.string().trim().url().max(2000).optional().nullable().or(z.literal("")),
  insurance_providers: z.array(z.string().trim().min(1).max(120)).max(30).optional().nullable(),
});

export const upsertMyTherapistProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const result = upsertSchema.safeParse(input);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join(" ");
      throw new Error(msg || "Please check the form and try again.");
    }
    return result.data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let uniqueSlug = data.slug;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data: existingSlugOwner, error: slugLookupError } = await supabaseAdmin
        .from("therapist_profiles")
        .select("user_id")
        .eq("slug", uniqueSlug)
        .maybeSingle();
      if (slugLookupError)
        safeThrow(
          "slug-lookup",
          slugLookupError,
          "We couldn't save your profile right now. Please try again in a moment.",
        );
      if (!existingSlugOwner || existingSlugOwner.user_id === userId) break;
      const suffix = attempt === 0 ? userId.slice(0, 8) : `${userId.slice(0, 8)}-${attempt + 1}`;
      uniqueSlug = `${data.slug.slice(0, Math.max(2, 59 - suffix.length))}-${suffix}`;
    }
    const row: Record<string, unknown> = {
      user_id: userId,
      slug: uniqueSlug,
      display_name: data.display_name,
      title: data.title ?? null,
      bio: data.bio ?? null,
      calendly_url: data.calendly_url ? data.calendly_url : null,
    };
    if (data.photo_url !== undefined) row.photo_url = data.photo_url ? data.photo_url : null;
    if (data.years_in_practice !== undefined) row.years_in_practice = data.years_in_practice;
    if (data.session_fee_50 !== undefined) row.session_fee_50 = data.session_fee_50;
    if (data.session_fee_80 !== undefined) row.session_fee_80 = data.session_fee_80;
    if (data.offers_intro_call !== undefined) row.offers_intro_call = data.offers_intro_call;
    if (data.gender !== undefined) row.gender = data.gender ? data.gender : null;
    if (data.specialties !== undefined) row.specialties = data.specialties;

    if (data.languages !== undefined) row.languages = data.languages;
    if (data.testimonials !== undefined) row.testimonials = data.testimonials;
    if (data.approach !== undefined) row.approach = data.approach;
    if (data.qualifications !== undefined) row.qualifications = data.qualifications;
    if (data.modalities !== undefined) row.modalities = data.modalities;
    if (data.location !== undefined) row.location = data.location;
    if (data.intro_video_url !== undefined)
      row.intro_video_url = data.intro_video_url ? data.intro_video_url : null;
    if (data.insurance_providers !== undefined)
      row.insurance_providers = data.insurance_providers ?? [];
    const { data: result, error } = await supabase
      .from("therapist_profiles")
      .upsert(row as never, { onConflict: "user_id" })
      .select()
      .single();
    if (error)
      safeThrow(
        "upsert",
        error,
        "We couldn't save your profile right now. Please try again in a moment.",
      );
    return { profile: result };
  });

export const getMyTherapistProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("therapist_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error)
      safeThrow(
        "get-mine",
        error,
        "We couldn't load your profile right now. Please try again in a moment.",
      );
    return { profile: data };
  });

const slugSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,60}$/),
});

export const getTherapistBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("therapist_profiles")
      .select(
        "id, slug, display_name, title, bio, calendly_url, published, photo_url, years_in_practice, session_fee_50, session_fee_80, offers_intro_call, specialties, languages, testimonials, approach, qualifications, modalities, location, intro_video_url, insurance_providers",
      )
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error)
      safeThrow(
        "get-by-slug",
        error,
        "We couldn't load this profile right now. Please try again in a moment.",
      );
    // Fallback: if the profile row is missing calendly_url (e.g. an older
    // connect that didn't back-populate it), pull the scheduling URL from
    // the linked Calendly connection so booking still works.
    if (profile && !profile.calendly_url) {
      const { data: conn } = await supabaseAdmin
        .from("calendly_connections")
        .select("scheduling_url")
        .eq("therapist_id", profile.id)
        .maybeSingle();
      if (conn?.scheduling_url) {
        profile.calendly_url = conn.scheduling_url;
        await supabaseAdmin
          .from("therapist_profiles")
          .update({ calendly_url: conn.scheduling_url })
          .eq("id", profile.id);
      }
    }
    // A profile only goes live once the therapist can actually be booked:
    // Cal.com connected with at least one bookable session (or a legacy
    // Calendly link). Approval alone isn't enough.
    if (profile && !(await isBookable(profile.id, profile.calendly_url))) {
      return { profile: null };
    }
    return { profile };
  });

/**
 * Bookable = a live Cal.com event type for at least one active session, or a
 * legacy Calendly scheduling link while therapists migrate over.
 */
async function isBookable(therapistId: string, calendlyUrl: string | null) {
  if (calendlyUrl) return true;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("therapist_services")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", therapistId)
    .eq("active", true)
    .not("calcom_event_type_id", "is", null);
  return (count ?? 0) > 0;
}

export const listPublishedTherapists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("therapist_profiles")
    .select(
      "id, slug, display_name, title, bio, calendly_url, photo_url, specialties, languages, years_in_practice, session_fee_50, testimonials, insurance_providers, intro_video_url, offers_intro_call, gender, approved_at",
    )
    .eq("published", true)
    .order("display_name", { ascending: true });
  if (error)
    safeThrow(
      "list-published",
      error,
      "We couldn't load the therapist list right now. Please try again in a moment.",
    );
  const therapists = data ?? [];
  const allIds = therapists.map((t) => t.id);
  const missing = therapists.filter((t) => !t.calendly_url).map((t) => t.id);
  // Cal.com-backed therapists are bookable through Veyro's own flow.
  const calcomReady = new Set<string>();
  // Real session prices power the directory price filter.
  const priceRange = new Map<string, { min: number; max: number }>();
  if (allIds.length) {
    const { data: services } = await supabaseAdmin
      .from("therapist_services")
      .select("therapist_id, price_cents, calcom_event_type_id")
      .in("therapist_id", allIds)
      .eq("active", true);
    for (const s of services ?? []) {
      if (s.calcom_event_type_id != null) calcomReady.add(s.therapist_id);
      const pounds = Math.round((s.price_cents ?? 0) / 100);
      if (!s.price_cents || pounds <= 0) continue;
      const cur = priceRange.get(s.therapist_id);
      priceRange.set(s.therapist_id, {
        min: cur ? Math.min(cur.min, pounds) : pounds,
        max: cur ? Math.max(cur.max, pounds) : pounds,
      });
    }
  }
  if (missing.length) {
    const { data: conns } = await supabaseAdmin
      .from("calendly_connections")
      .select("therapist_id, scheduling_url")
      .in("therapist_id", missing);
    const byId = new Map((conns ?? []).map((c) => [c.therapist_id, c.scheduling_url] as const));
    for (const t of therapists) {
      if (!t.calendly_url) {
        const url = byId.get(t.id);
        if (url) t.calendly_url = url;
      }
    }
  }
  // Review counts drive the "New on Veyro" badge (no invented ratings).
  const reviewStats = new Map<string, { count: number; total: number }>();
  if (allIds.length) {
    const { data: reviews } = await supabaseAdmin
      .from("therapist_reviews")
      .select("therapist_id, rating")
      .in("therapist_id", allIds);
    for (const r of reviews ?? []) {
      const cur = reviewStats.get(r.therapist_id) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.rating ?? 0;
      reviewStats.set(r.therapist_id, cur);
    }
  }
  // Hide approved-but-not-yet-bookable profiles from the directory.
  return {
    therapists: therapists
      .filter((t) => Boolean(t.calendly_url) || calcomReady.has(t.id))
      .map((t) => {
        const stats = reviewStats.get(t.id);
        return {
          ...t,
          min_price: priceRange.get(t.id)?.min ?? null,
          max_price: priceRange.get(t.id)?.max ?? null,
          review_count: stats?.count ?? 0,
          review_avg: stats && stats.count > 0 ? stats.total / stats.count : null,
        };
      }),
  };
});

export const listPublishedTherapistSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("therapist_profiles")
    .select("id, slug, updated_at, calendly_url")
    .eq("published", true);
  if (error)
    safeThrow(
      "list-slugs",
      error,
      "We couldn't load the therapist list right now. Please try again in a moment.",
    );
  const rows = data ?? [];
  const { data: services } = await supabaseAdmin
    .from("therapist_services")
    .select("therapist_id")
    .eq("active", true)
    .not("calcom_event_type_id", "is", null);
  const calcomReady = new Set((services ?? []).map((s) => s.therapist_id));
  const slugs = rows
    .filter((r) => Boolean(r.calendly_url) || calcomReady.has(r.id))
    .map(({ slug, updated_at }) => ({ slug, updated_at }));
  return { slugs };
});
