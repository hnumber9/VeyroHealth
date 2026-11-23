import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listPublishedTherapists } from "@/lib/therapist-profiles.functions";
import {
  SEO_STATUSES,
  MAX_FAQS,
  pickSeoTherapists,
  slugify,
  validatePage,
  type SeoFaq,
  type SeoPageInput,
  type SeoTherapistCard,
} from "@/lib/seo-pages";

// The seo tables are service-role only; every write is admin-checked first.
const admin = async () =>
  (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;

async function assertAdmin(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

const pageSchema = z.object({
  slug: z.string().max(200),
  seo_title: z.string().max(200),
  meta_description: z.string().max(400).default(""),
  h1: z.string().max(300),
  therapist_section_heading: z.string().trim().max(300).default(""),
  intro: z.string().max(6000).default(""),
  body: z.string().max(31000).default(""),
  faqs: z
    .array(z.object({ q: z.string().max(500), a: z.string().max(3000) }))
    .max(MAX_FAQS)
    .default([]),
  areas: z.array(z.string().max(120)).max(500).default([]),
  therapy_approaches: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  related_slugs: z.array(z.string().max(200)).max(20).default([]),
  published: z.boolean().default(false),
  status: z.enum(SEO_STATUSES).default("draft"),
  reviewer_name: z.string().max(200).default(""),
  reviewer_qualifications: z.string().max(300).default(""),
  reviewed_on: z.string().max(10).default(""),
});

function clean(p: z.infer<typeof pageSchema>): SeoPageInput {
  const page: SeoPageInput = {
    ...p,
    slug: slugify(p.slug),
    seo_title: p.seo_title.trim(),
    meta_description: p.meta_description.trim(),
    h1: p.h1.trim(),
    intro: p.intro.trim(),
    faqs: p.faqs.map((f) => ({ q: f.q.trim(), a: f.a.trim() })),
    areas: Array.from(new Set(p.areas.map((a) => a.trim()).filter(Boolean))),
    therapy_approaches: Array.from(
      new Set(p.therapy_approaches.map((a) => a.trim()).filter(Boolean)),
    ),
    related_slugs: Array.from(new Set(p.related_slugs.map(slugify).filter(Boolean))),
    reviewer_name: p.reviewer_name.trim(),
    reviewer_qualifications: p.reviewer_qualifications.trim(),
    reviewed_on: p.reviewed_on.trim(),
    published: p.status === "published",
  };
  const problem = validatePage(page);
  if (problem) throw new Error(problem);
  return page;
}

/** Database row shape: an empty review date is stored as null. */
const toRow = (p: SeoPageInput) => ({ ...p, reviewed_on: p.reviewed_on || null });

type Live = Awaited<ReturnType<typeof listPublishedTherapists>>["therapists"];

function toCard(t: Live[number], matched: string[]): SeoTherapistCard {
  return {
    slug: t.slug,
    display_name: t.display_name,
    title: t.title,
    photo_url: t.photo_url,
    min_price: t.min_price,
    matched,
  };
}

function matchesFor(all: Live, areas: string[]) {
  return pickSeoTherapists(all, areas).matched;
}

/** Exact-speciality therapists (max 6) plus a separately labelled broader-support list. */
async function therapistsFor(areas: string[]) {
  let all: Live = [];
  try {
    all = (await listPublishedTherapists()).therapists;
  } catch (e) {
    console.error("[seo] therapist load failed", e);
    return { therapists: [] as SeoTherapistCard[], broader: [] as SeoTherapistCard[] };
  }
  const { matched, broader } = pickSeoTherapists(all, areas);
  return {
    therapists: matched.map((x) => toCard(x.t, x.matched)),
    broader: broader.map((t) => toCard(t, [])),
  };
}

const PUBLIC_COLS =
  "slug, seo_title, meta_description, h1, therapist_section_heading, intro, body, faqs, areas, therapy_approaches, related_slugs, updated_at, reviewer_name, reviewer_qualifications, reviewed_on";

/** Public: a live page with its therapists and related pages, or a redirect target. */
export const getSeoPage = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: slugify(String(d.slug ?? "")).slice(0, 120) }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: page } = await sb
      .from("seo_pages")
      .select(PUBLIC_COLS)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (!page) {
      const { data: r } = await sb
        .from("seo_redirects")
        .select("to_slug")
        .eq("from_slug", data.slug)
        .maybeSingle();
      return r ? { kind: "redirect" as const, to: r.to_slug as string } : null;
    }
    const areas: string[] = page.areas ?? [];
    const relatedSlugs: string[] = page.related_slugs ?? [];
    const { therapists, broader } = await therapistsFor(areas);

    // Hand-picked related pages first, then pages sharing areas.
    const related: { slug: string; h1: string }[] = [];
    if (relatedSlugs.length) {
      const { data: picked } = await sb
        .from("seo_pages")
        .select("slug, h1")
        .eq("published", true)
        .in("slug", relatedSlugs);
      for (const s of relatedSlugs) {
        const p = (picked ?? []).find((x: { slug: string }) => x.slug === s);
        if (p && p.slug !== page.slug) related.push(p);
      }
    }
    if (areas.length && related.length < 6) {
      const { data: shared } = await sb
        .from("seo_pages")
        .select("slug, h1")
        .eq("published", true)
        .overlaps("areas", areas)
        .neq("slug", page.slug)
        .limit(12);
      for (const p of shared ?? [])
        if (related.length < 6 && !related.some((r) => r.slug === p.slug)) related.push(p);
    }
    return {
      kind: "page" as const,
      page: {
        slug: page.slug as string,
        seo_title: page.seo_title as string,
        meta_description: page.meta_description as string,
        h1: page.h1 as string,
        therapist_section_heading: (page.therapist_section_heading ?? "") as string,
        intro: page.intro as string,
        body: page.body as string,
        faqs: (page.faqs ?? []) as SeoFaq[],
        areas,
        therapy_approaches: (page.therapy_approaches ?? []) as string[],
        updated_at: page.updated_at as string,
        reviewer_name: (page.reviewer_name ?? "") as string,
        reviewer_qualifications: (page.reviewer_qualifications ?? "") as string,
        reviewed_on: (page.reviewed_on ?? "") as string,
      },
      therapists,
      broader,
      related,
    };
  });

/** Public: live page slugs for the sitemap. */
export const listSeoSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb
    .from("seo_pages")
    .select("slug, updated_at")
    .eq("published", true)
    .order("slug");
  if (error) throw new Error("Could not load pages");
  return { slugs: (data ?? []) as { slug: string; updated_at: string }[] };
});

export const listSeoPagesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = await admin();
    const { data } = await sb
      .from("seo_pages")
      .select("*")
      .order("updated_at", { ascending: false });
    let all: Live = [];
    try {
      all = (await listPublishedTherapists()).therapists;
    } catch {
      /* counts show 0 */
    }
    const pages = ((data ?? []) as (SeoPageInput & { id: string; updated_at: string })[]).map(
      (p) => ({
        ...p,
        faqs: p.faqs ?? [],
        areas: p.areas ?? [],
        therapy_approaches: p.therapy_approaches ?? [],
        therapist_section_heading: p.therapist_section_heading ?? "",
        related_slugs: p.related_slugs ?? [],
        reviewed_on: p.reviewed_on ?? "",
        match_count: matchesFor(all, p.areas ?? []).length,
      }),
    );
    return { pages };
  });

/** Admin preview: therapists a draft page would show. */
export const previewSeoTherapists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ areas: z.array(z.string().max(120)).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return therapistsFor(data.areas);
  });

export const saveSeoPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().nullable(), page: pageSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const page = clean(data.page);
    const sb = await admin();
    let oldSlug: string | null = null;
    if (data.id) {
      const { data: cur } = await sb
        .from("seo_pages")
        .select("slug")
        .eq("id", data.id)
        .maybeSingle();
      if (!cur) throw new Error("That page no longer exists.");
      oldSlug = cur.slug;
    }
    const { error } = data.id
      ? await sb.from("seo_pages").update(toRow(page)).eq("id", data.id)
      : await sb.from("seo_pages").insert(toRow(page));
    if (error) {
      console.error("[seo] save failed", error);
      throw new Error(
        error.code === "23505"
          ? "Another page already uses that web address."
          : /reviewer/.test(error.message ?? "")
            ? "Add the reviewer's name, qualifications and review date first."
            : "Couldn't save the page.",
      );
    }
    // The new address must never redirect away from itself.
    await sb.from("seo_redirects").delete().eq("from_slug", page.slug);
    if (oldSlug && oldSlug !== page.slug) {
      await sb.from("seo_redirects").update({ to_slug: page.slug }).eq("to_slug", oldSlug);
      await sb.from("seo_redirects").upsert({ from_slug: oldSlug, to_slug: page.slug });
    }
    return { ok: true };
  });

export const deleteSeoPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = await admin();
    const { data: cur } = await sb.from("seo_pages").select("slug").eq("id", data.id).maybeSingle();
    await sb.from("seo_pages").delete().eq("id", data.id);
    if (cur) await sb.from("seo_redirects").delete().eq("to_slug", cur.slug);
    return { ok: true };
  });

/** Bulk import of already-reviewed rows: updates matching addresses, creates new ones. */
export const importSeoPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ pages: z.array(pageSchema).min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const pages = data.pages.map(clean);
    const sb = await admin();
    for (let i = 0; i < pages.length; i += 200) {
      const { error } = await sb
        .from("seo_pages")
        .upsert(pages.slice(i, i + 200).map(toRow), { onConflict: "slug" });
      if (error) {
        console.error("[seo] import failed", error);
        throw new Error(`Import stopped after ${i} pages. Please try again.`);
      }
    }
    await sb
      .from("seo_redirects")
      .delete()
      .in(
        "from_slug",
        pages.map((p) => p.slug),
      );
    return { count: pages.length };
  });
