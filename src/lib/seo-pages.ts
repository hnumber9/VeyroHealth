// Browser-safe helpers for SEO landing pages: types, validation and CSV.

export type SeoFaq = { q: string; a: string };

export type SeoPageInput = {
  slug: string;
  seo_title: string;
  meta_description: string;
  h1: string;
  therapist_section_heading: string;
  intro: string;
  body: string;
  faqs: SeoFaq[];
  areas: string[];
  therapy_approaches: string[];
  related_slugs: string[];
  published: boolean;
  status: SeoStatus;
  reviewer_name: string;
  reviewer_qualifications: string;
  /** YYYY-MM-DD, or "" when not reviewed yet. */
  reviewed_on: string;
};

export const SEO_STATUSES = ["draft", "clinical_review", "approved", "published"] as const;
export type SeoStatus = (typeof SEO_STATUSES)[number];
export const STATUS_LABEL: Record<SeoStatus, string> = {
  draft: "Draft",
  clinical_review: "Clinical review",
  approved: "Approved",
  published: "Published",
};

/** Turns spreadsheet wording ("Clinical review", "live", "yes") into a status. */
export function parseStatus(v: string): SeoStatus | null {
  const k = v
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!k) return null;
  if (k === "clinical_review" || k === "review" || k === "in_review") return "clinical_review";
  if (k === "approved") return "approved";
  if (/^(published|live|yes|y|true|1)$/.test(k)) return "published";
  if (/^(draft|no|n|false|0|hidden)$/.test(k)) return "draft";
  return null;
}

export type SeoTherapistCard = {
  slug: string;
  display_name: string;
  title: string | null;
  photo_url: string | null;
  min_price: number | null;
  matched: string[];
};

export const MAX_FAQS = 10;
export const MIN_MATCHES = 3;
export const MAX_CARDS = 6;

type PickableTherapist = {
  slug: string;
  display_name: string;
  specialties?: string[] | null;
  approved_at?: string | null;
};

/**
 * Splits live therapists for a page: `matched` holds only therapists who selected one of the
 * page's areas (max 6). `broader` is a separately labelled top-up of newest joiners, shown only
 * when there are fewer than MIN_MATCHES exact matches, and never presented as specialists.
 */
export function pickSeoTherapists<T extends PickableTherapist>(all: T[], areas: string[]) {
  const wanted = new Set(areas.map((a) => a.trim().toLowerCase()).filter(Boolean));
  const matched = all
    .map((t) => ({
      t,
      matched: (t.specialties ?? []).filter((s) => wanted.has(s.trim().toLowerCase())),
    }))
    .filter((x) => x.matched.length > 0)
    .sort(
      (a, b) =>
        b.matched.length - a.matched.length || a.t.display_name.localeCompare(b.t.display_name),
    )
    .slice(0, MAX_CARDS);
  if (matched.length >= MIN_MATCHES || wanted.size === 0) return { matched, broader: [] as T[] };
  const taken = new Set(matched.map((m) => m.t.slug));
  const broader = all
    .filter((t) => !taken.has(t.slug))
    .sort((a, b) => (b.approved_at ?? "").localeCompare(a.approved_at ?? ""))
    .slice(0, MAX_CARDS - matched.length);
  return { matched, broader };
}

/** Human name for the page's speciality, e.g. "Dyspraxia" or "Gaming or Internet Addiction". */
export function specialityLabel(areas: string[], h1: string) {
  const a = areas.map((x) => x.trim()).filter(Boolean);
  if (a.length === 0) return h1.replace(/^(online\s+)?therapy for\s+/i, "").trim() || h1;
  return a.length === 1 ? a[0] : `${a.slice(0, -1).join(", ")} or ${a[a.length - 1]}`;
}

// Top-level web addresses the site already uses; pages can't take these.
export const RESERVED_SLUGS = new Set([
  "about",
  "admin",
  "api",
  "booking",
  "client",
  "dashboard-to-be",
  "faqs",
  "home-to-be",
  "how-veyro-works",
  "index",
  "lovable",
  "privacy",
  "reset-password",
  "robots",
  "robots-txt",
  "signup-to-be",
  "sitemap",
  "sitemap-xml",
  "terms-and-conditions",
  "therapist",
  "therapists",
  "therapy-fund",
  "partners",
  "favicon",
  "assets",
  "_serverfn",
]);

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const emptyPage = (): SeoPageInput => ({
  slug: "",
  seo_title: "",
  meta_description: "",
  h1: "",
  intro: "",
  body: "",
  therapist_section_heading: "",
  faqs: [],
  areas: [],
  therapy_approaches: [],
  related_slugs: [],
  published: false,
  status: "draft",
  reviewer_name: "",
  reviewer_qualifications: "",
  reviewed_on: "",
});

export function validatePage(p: SeoPageInput): string | null {
  if (!p.slug || !SLUG_RE.test(p.slug))
    return "Web address must use lowercase letters, numbers and hyphens.";
  if (p.slug.length > 100) return "Web address is too long (max 100).";
  if (RESERVED_SLUGS.has(p.slug)) return `"/${p.slug}" is already used by the site.`;
  if (!p.seo_title.trim()) return "Google title is missing.";
  if (p.seo_title.length > 120) return "Google title is too long (max 120).";
  if (p.meta_description.length > 320) return "Google description is too long (max 320).";
  if ((p.therapist_section_heading ?? "").length > 300)
    return "Therapist section heading is too long (max 300).";
  if (!p.h1.trim()) return "Page heading is missing.";
  if (p.intro.length > 5000) return "Intro is too long (max 5,000).";
  if (p.body.length > 30000) return "Main content is too long (max 30,000).";
  if (p.faqs.length > MAX_FAQS) return `Too many FAQs (max ${MAX_FAQS}).`;
  if (p.faqs.some((f) => !f.q.trim() || !f.a.trim()))
    return "Every FAQ needs a question and an answer.";
  if (p.reviewed_on && !/^\d{4}-\d{2}-\d{2}$/.test(p.reviewed_on))
    return "Review date must look like 2026-10-27.";
  if (
    (p.status === "approved" || p.status === "published") &&
    (!p.reviewer_name.trim() || !p.reviewer_qualifications.trim() || !p.reviewed_on)
  )
    return "Add the reviewing therapist's name, qualifications and review date before approving or publishing.";
  return null;
}

/** Soft warnings shown in the admin list (page can still go live). */
export function pageWarnings(p: SeoPageInput, matchCount: number): string[] {
  const w: string[] = [];
  if (!p.meta_description.trim()) w.push("No Google description");
  if (p.faqs.length === 0) w.push("No FAQs");
  if (p.areas.length === 0) w.push("No areas chosen");
  else if (matchCount < MIN_MATCHES)
    w.push(`Only ${matchCount} matching therapist${matchCount === 1 ? "" : "s"}`);
  return w;
}

export const CSV_HEADERS = [
  "slug",
  "seo_title",
  "meta_description",
  "h1",
  "therapist_section_heading",
  "intro",
  "body",
  "areas",
  "therapy_approaches",
  "related_pages",
  "status",
  "reviewer_name",
  "reviewer_qualifications",
  "reviewed_on",
  ...Array.from({ length: MAX_FAQS }, (_, i) => [
    `faq${i + 1}_question`,
    `faq${i + 1}_answer`,
  ]).flat(),
];

/** RFC-4180-style CSV parser (quoted fields, escaped quotes, newlines in quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const list = (v: string) =>
  v
    .split(/[;|]/)
    .map((a) => a.trim())
    .filter(Boolean);

export type CsvRow = { line: number; page: SeoPageInput | null; error: string | null };

/** Turns CSV text into one result per row (valid page or plain-English error). */
export function csvToRows(text: string): { rows: CsvRow[]; fileError: string | null } {
  const raw = parseCsv(text);
  if (raw.length < 2) return { rows: [], fileError: "The file has no pages in it." };
  const header = raw[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (n: string) => header.indexOf(n);
  const missing = ["slug", "seo_title", "h1"].filter((c) => col(c) === -1);
  if (missing.length)
    return {
      rows: [],
      fileError: `Missing column(s): ${missing.join(", ")}. Use the CSV template.`,
    };
  const seen = new Set<string>();
  const rows = raw.slice(1).map((r, idx): CsvRow => {
    const line = idx + 2;
    const get = (n: string) => (col(n) === -1 ? "" : (r[col(n)] ?? "").trim());
    const page: SeoPageInput = {
      slug: slugify(get("slug")),
      seo_title: get("seo_title"),
      meta_description: get("meta_description"),
      h1: get("h1"),
      therapist_section_heading: get("therapist_section_heading"),
      intro: get("intro"),
      body: get("body"),
      areas: list(get("areas")),
      therapy_approaches: list(get("therapy_approaches")),
      related_slugs: list(get("related_pages")).map(slugify).filter(Boolean),
      published: false,
      status: "draft",
      reviewer_name: get("reviewer_name"),
      reviewer_qualifications: get("reviewer_qualifications"),
      reviewed_on: get("reviewed_on"),
      faqs: [],
    };
    const rawStatus = col("status") !== -1 ? get("status") : get("published");
    const status = parseStatus(rawStatus);
    if (rawStatus && !status)
      return {
        line,
        page: null,
        error: `Row ${line}: status "${rawStatus}" should be Draft, Clinical review, Approved or Published.`,
      };
    page.status = status ?? "draft";
    page.published = page.status === "published";
    for (let i = 1; i <= MAX_FAQS; i++) {
      const q = get(`faq${i}_question`);
      const a = get(`faq${i}_answer`);
      if (q || a) page.faqs.push({ q, a });
    }
    const problem = validatePage(page);
    if (problem) return { line, page: null, error: `Row ${line}: ${problem}` };
    if (seen.has(page.slug))
      return {
        line,
        page: null,
        error: `Row ${line}: "/${page.slug}" appears more than once in the file.`,
      };
    seen.add(page.slug);
    return { line, page, error: null };
  });
  return { rows, fileError: null };
}

export function csvCell(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function pagesToCsv(pages: SeoPageInput[]) {
  const lines = [CSV_HEADERS.join(",")];
  for (const p of pages) {
    const faqs = Array.from({ length: MAX_FAQS }, (_, i) => [
      p.faqs[i]?.q ?? "",
      p.faqs[i]?.a ?? "",
    ]).flat();
    lines.push(
      [
        p.slug,
        p.seo_title,
        p.meta_description,
        p.h1,
        p.therapist_section_heading ?? "",
        p.intro,
        p.body,
        p.areas.join("; "),
        (p.therapy_approaches ?? []).join("; "),
        p.related_slugs.join("; "),
        STATUS_LABEL[p.status],
        p.reviewer_name,
        p.reviewer_qualifications,
        p.reviewed_on,
        ...faqs,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\n");
}
