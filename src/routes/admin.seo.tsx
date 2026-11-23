import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess } from "@/lib/admin.functions";
import {
  deleteSeoPage,
  importSeoPages,
  listSeoPagesAdmin,
  previewSeoTherapists,
  saveSeoPage,
} from "@/lib/seo-pages.functions";
import {
  SEO_STATUSES,
  STATUS_LABEL,
  csvToRows,
  emptyPage,
  MAX_FAQS,
  pageWarnings,
  pagesToCsv,
  slugify,
  validatePage,
  type CsvRow,
  type SeoPageInput,
} from "@/lib/seo-pages";
import { ALL_AREAS } from "@/lib/areas-of-expertise";
import { SeoPageView, type SeoViewData } from "@/components/seo/SeoPageView";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/seo")({
  component: AdminSeo,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — SEO pages | Veyro Health" },
      { name: "description", content: "Create and manage Veyro's search landing pages." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — SEO pages | Veyro Health" },
      { property: "og:description", content: "Create and manage Veyro's search landing pages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = SeoPageInput & { id: string; updated_at: string; match_count: number };

const TEMPLATE: SeoPageInput = {
  ...emptyPage(),
  slug: "therapy-for-anxiety",
  seo_title: "Therapy for Anxiety | Online Anxiety Therapists | Veyro",
  meta_description: "Find a qualified anxiety therapist online and book a session today.",
  h1: "Therapy for anxiety",
  therapist_section_heading: "Find therapists offering online anxiety therapy",
  intro: "A short introduction to the page.",
  body: "## How therapy can help\n\nA paragraph of content.\n\n- A bullet point\n- Another bullet point",
  areas: ["Anxiety", "Panic Attacks"],
  related_slugs: ["therapy-for-depression"],
  faqs: [{ q: "How long does therapy for anxiety take?", a: "It depends on the person." }],
};

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
}

function AdminSeo() {
  const nav = useNavigate();
  const check = useServerFn(getAdminAccess);
  const list = useServerFn(listSeoPagesAdmin);
  const save = useServerFn(saveSeoPage);
  const del = useServerFn(deleteSeoPage);
  const imp = useServerFn(importSeoPages);
  const previewTherapists = useServerFn(previewSeoTherapists);

  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<{ id: string | null; page: SeoPageInput } | null>(null);
  const [preview, setPreview] = useState<SeoViewData | null>(null);
  const [review, setReview] = useState<CsvRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [approachDraft, setApproachDraft] = useState("");
  const [status, setStatus] = useState<"all" | "warnings" | (typeof SEO_STATUSES)[number]>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => setRows((await list({})).pages as Row[]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return nav({ to: "/admin/signin", replace: true });
      const { isAdmin } = await check({}).catch(() => ({ isAdmin: false }));
      if (!isAdmin) return setState("denied");
      await load();
      setState("ready");
    })();
  }, []);

  const existing = useMemo(() => new Set(rows.map((r) => r.slug)), [rows]);

  async function onSave() {
    if (!editing) return;
    const problem = validatePage({ ...editing.page, slug: slugify(editing.page.slug) });
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      await save({ data: { id: editing.id, page: editing.page } });
      toast.success(
        editing.page.status === "published"
          ? "Saved and live"
          : `Saved as ${STATUS_LABEL[editing.page.status]} (not public)`,
      );
      setEditing(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onPreview(source?: SeoViewData["page"] & { related_slugs: string[] }) {
    const page = source ?? editing?.page;
    if (!page) return;
    setBusy(true);
    try {
      const t = await previewTherapists({ data: { areas: page.areas } });
      const related = page.related_slugs
        .map((s) => rows.find((r) => r.slug === s))
        .filter((r): r is Row => !!r)
        .map((r) => ({ slug: r.slug, h1: r.h1 }));
      setPreview({ page, therapists: t.therapists, broader: t.broader, related });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(f: File) {
    const { rows: parsed, fileError } = csvToRows(await f.text());
    if (fileError) return toast.error(fileError);
    setReview(parsed);
  }

  async function confirmImport() {
    if (!review) return;
    const pages = review.filter((r) => r.page).map((r) => r.page!);
    if (!pages.length) return toast.error("There are no valid rows to import.");
    setBusy(true);
    try {
      const { count } = await imp({ data: { pages } });
      toast.success(`${count} page${count === 1 ? "" : "s"} imported`);
      setReview(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-foreground/50" />
      </div>
    );
  if (state === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="font-serif text-2xl">Access denied</p>
          <p className="mt-2 text-sm text-foreground/70">
            This area is restricted to Veyro admins.
          </p>
        </div>
      </div>
    );
  }

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (
      needle &&
      !r.slug.includes(needle) &&
      !r.h1.toLowerCase().includes(needle) &&
      !r.seo_title.toLowerCase().includes(needle)
    )
      return false;
    if (status === "warnings") return pageWarnings(r, r.match_count).length > 0;
    if (status !== "all") return r.status === status;
    return true;
  });
  const field =
    "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground";
  const set = (patch: Partial<SeoPageInput>) =>
    editing && setEditing({ ...editing, page: { ...editing.page, ...patch } });
  const counter = (n: number, ideal: number) => (
    <span className={n > ideal ? "text-destructive" : "text-foreground/50"}>
      {n}/{ideal}
    </span>
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to="/admin"
        search={{ review: undefined }}
        className="text-sm text-foreground/60 underline"
      >
        ← Back to admin
      </Link>
      <h1 className="mt-3 font-serif text-3xl text-foreground">SEO pages</h1>
      <p className="mt-1 text-sm text-foreground/70">
        {rows.filter((r) => r.status === "published").length} published · {rows.length} total
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setEditing({ id: null, page: emptyPage() })}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New page
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          <Upload className="h-4 w-4" /> Upload spreadsheet
        </button>
        <button
          onClick={() => download("veyro-seo-pages.csv", pagesToCsv(rows))}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          <Download className="h-4 w-4" /> Download all
        </button>
        <button
          onClick={() => download("veyro-seo-pages-template.csv", pagesToCsv([TEMPLATE]))}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          Download template
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-2 text-xs text-foreground/60">
        Save the spreadsheet as CSV. Rows with an existing web address update that page; new
        addresses create pages. Separate areas and related pages with ";".
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pages"
          className={`${field} mt-0 max-w-xs`}
        />
        {(["all", ...SEO_STATUSES, "warnings"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${status === s ? "bg-primary text-primary-foreground" : "border border-border text-foreground/70"}`}
          >
            {s === "all"
              ? "All"
              : s === "warnings"
                ? "Needs attention"
                : `${STATUS_LABEL[s]} (${rows.filter((r) => r.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {shown.length === 0 && (
          <p className="p-6 text-sm text-foreground/60">
            {rows.length ? "No pages match." : "No pages yet. Create one or upload a spreadsheet."}
          </p>
        )}
        {shown.map((r) => {
          const warnings = pageWarnings(r, r.match_count);
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{r.h1}</p>
                <p className="text-xs text-foreground/60">
                  /{r.slug} · {r.match_count} matching therapist{r.match_count === 1 ? "" : "s"} ·
                  edited {new Date(r.updated_at).toLocaleDateString("en-GB")}
                </p>
                {warnings.length > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" /> {warnings.join(" · ")}
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${r.status === "published" ? "bg-primary/10 text-primary" : r.status === "approved" ? "bg-accent text-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {STATUS_LABEL[r.status]}
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  onPreview({
                    slug: r.slug,
                    h1: r.h1,
                    therapist_section_heading: r.therapist_section_heading,
                    intro: r.intro,
                    body: r.body,
                    faqs: r.faqs,
                    areas: r.areas,
                    therapy_approaches: r.therapy_approaches,
                    related_slugs: r.related_slugs,
                    reviewer_name: r.reviewer_name,
                    reviewer_qualifications: r.reviewer_qualifications,
                    reviewed_on: r.reviewed_on,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-sm hover:border-primary hover:text-primary"
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
              {r.published && (
                <a
                  href={`/${r.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="View page"
                  className="text-foreground/60 hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button
                onClick={() => {
                  setApproachDraft("");
                  setEditing({
                    id: r.id,
                    page: {
                      slug: r.slug,
                      seo_title: r.seo_title,
                      meta_description: r.meta_description,
                      h1: r.h1,
                      therapist_section_heading: r.therapist_section_heading,
                      intro: r.intro,
                      body: r.body,
                      faqs: r.faqs,
                      areas: r.areas,
                      therapy_approaches: r.therapy_approaches,
                      related_slugs: r.related_slugs,
                      published: r.published,
                      status: r.status,
                      reviewer_name: r.reviewer_name,
                      reviewer_qualifications: r.reviewer_qualifications,
                      reviewed_on: r.reviewed_on,
                    },
                  });
                }}
                className="rounded-lg border border-border px-3 py-1 text-sm"
              >
                Edit
              </button>
              <button
                aria-label="Delete page"
                onClick={async () => {
                  if (confirm(`Delete /${r.slug}? This can't be undone.`)) {
                    await del({ data: { id: r.id } });
                    toast.success("Page deleted");
                    await load();
                  }
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {review && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6">
            <h2 className="font-serif text-2xl">Check your upload</h2>
            {(() => {
              const ok = review.filter((r) => r.page);
              const created = ok.filter((r) => !existing.has(r.page!.slug)).length;
              return (
                <p className="mt-2 text-sm text-foreground/70">
                  {created} new · {ok.length - created} updated · {review.length - ok.length} with
                  errors (skipped). Nothing is saved until you confirm.
                </p>
              );
            })()}
            <div className="mt-4 max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {review.map((r) => (
                <div key={r.line} className="flex items-start gap-3 p-3 text-sm">
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${r.error ? "bg-destructive/10 text-destructive" : existing.has(r.page!.slug) ? "bg-accent text-foreground" : "bg-primary/10 text-primary"}`}
                  >
                    {r.error ? "Error" : existing.has(r.page!.slug) ? "Updated" : "New"}
                  </span>
                  <span className="min-w-0">
                    {r.error ?? (
                      <>
                        /{r.page!.slug} — {r.page!.h1}{" "}
                        <em className="text-foreground/50">({STATUS_LABEL[r.page!.status]})</em>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setReview(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={busy || !review.some((r) => r.page)}
                onClick={confirmImport}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Importing…" : `Import ${review.filter((r) => r.page).length} pages`}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && !preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6">
            <h2 className="font-serif text-2xl">{editing.id ? "Edit page" : "New page"}</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Web address
                <div className="mt-1 flex items-center rounded-xl border border-border bg-background px-3">
                  <span className="text-sm text-foreground/50">veyrohealth.com/</span>
                  <input
                    className="w-full bg-transparent py-2 text-sm outline-none"
                    value={editing.page.slug}
                    onChange={(e) => set({ slug: e.target.value })}
                    onBlur={(e) => set({ slug: slugify(e.target.value) })}
                    placeholder="therapy-for-anxiety"
                  />
                </div>
                {editing.id && (
                  <span className="mt-1 block text-xs font-normal text-foreground/60">
                    Changing this keeps the old address working by redirecting to the new one.
                  </span>
                )}
              </label>
              <label className="block text-sm font-medium">
                <span className="flex justify-between">
                  Google title {counter(editing.page.seo_title.length, 60)}
                </span>
                <input
                  className={field}
                  value={editing.page.seo_title}
                  onChange={(e) => set({ seo_title: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                <span className="flex justify-between">
                  Google description {counter(editing.page.meta_description.length, 155)}
                </span>
                <textarea
                  rows={2}
                  className={field}
                  value={editing.page.meta_description}
                  onChange={(e) => set({ meta_description: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Page heading
                <input
                  className={field}
                  value={editing.page.h1}
                  onChange={(e) => set({ h1: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Therapist section heading
                <input
                  className={field}
                  value={editing.page.therapist_section_heading}
                  onChange={(e) => set({ therapist_section_heading: e.target.value })}
                  maxLength={300}
                  placeholder="Leave blank to keep the current heading"
                />
              </label>
              <label className="block text-sm font-medium">
                Intro
                <textarea
                  rows={3}
                  className={field}
                  value={editing.page.intro}
                  onChange={(e) => set({ intro: e.target.value })}
                />
              </label>
              <SectionsEditor
                key={editing.id ?? "new"}
                body={editing.page.body}
                onChange={(body) => set({ body })}
                field={field}
              />

              <fieldset>
                <legend className="text-sm font-medium">Recommended therapy approaches</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {editing.page.therapy_approaches.map((approach) => (
                    <span
                      key={approach}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1 text-sm"
                    >
                      {approach}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label={`Remove ${approach}`}
                        onClick={() =>
                          set({
                            therapy_approaches: editing.page.therapy_approaches.filter(
                              (a) => a !== approach,
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    aria-label="Therapy approach"
                    className={field}
                    value={approachDraft}
                    onChange={(e) => setApproachDraft(e.target.value)}
                    placeholder="e.g. Cognitive behavioural therapy (CBT)"
                    maxLength={120}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1 shrink-0"
                    disabled={!approachDraft.trim() || editing.page.therapy_approaches.length >= 20}
                    onClick={() => {
                      const approach = approachDraft.trim();
                      if (
                        !approach ||
                        editing.page.therapy_approaches.some(
                          (a) => a.toLowerCase() === approach.toLowerCase(),
                        )
                      )
                        return;
                      set({ therapy_approaches: [...editing.page.therapy_approaches, approach] });
                      setApproachDraft("");
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </fieldset>

              <div>
                <p className="text-sm font-medium">
                  Areas of expertise{" "}
                  <span className="font-normal text-foreground/60">
                    (tick as many as you like — therapists with any ticked area appear)
                  </span>
                </p>
                <div className="mt-2 flex gap-3 text-xs">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => set({ areas: [...ALL_AREAS] })}
                  >
                    Select all (general page)
                  </button>
                  <button type="button" className="underline" onClick={() => set({ areas: [] })}>
                    Clear
                  </button>
                  <span className="text-foreground/60">{editing.page.areas.length} selected</span>
                </div>
                <div className="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-2">
                  {ALL_AREAS.map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editing.page.areas.includes(a)}
                        onChange={(e) =>
                          set({
                            areas: e.target.checked
                              ? [...editing.page.areas, a]
                              : editing.page.areas.filter((x) => x !== a),
                          })
                        }
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">
                  Related pages{" "}
                  <span className="font-normal text-foreground/60">
                    (shown first; pages with shared areas are added automatically)
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {editing.page.related_slugs.map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        set({ related_slugs: editing.page.related_slugs.filter((x) => x !== s) })
                      }
                      className="rounded-full border border-border px-3 py-1 text-xs"
                    >
                      /{s} ×
                    </button>
                  ))}
                </div>
                <select
                  className={field}
                  value=""
                  onChange={(e) =>
                    e.target.value &&
                    set({ related_slugs: [...editing.page.related_slugs, e.target.value] })
                  }
                >
                  <option value="">Add a related page…</option>
                  {rows
                    .filter(
                      (r) =>
                        r.slug !== editing.page.slug &&
                        !editing.page.related_slugs.includes(r.slug),
                    )
                    .map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.h1} (/{r.slug})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <p className="text-sm font-medium">
                  FAQs ({editing.page.faqs.length}/{MAX_FAQS})
                </p>
                {editing.page.faqs.map((f, i) => (
                  <div key={i} className="mt-2 rounded-xl border border-border p-3">
                    <input
                      className={field}
                      placeholder="Question"
                      value={f.q}
                      onChange={(e) =>
                        set({
                          faqs: editing.page.faqs.map((x, j) =>
                            j === i ? { ...x, q: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <textarea
                      rows={2}
                      className={field}
                      placeholder="Answer"
                      value={f.a}
                      onChange={(e) =>
                        set({
                          faqs: editing.page.faqs.map((x, j) =>
                            j === i ? { ...x, a: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <button
                      onClick={() => set({ faqs: editing.page.faqs.filter((_, j) => j !== i) })}
                      className="mt-1 text-xs text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {editing.page.faqs.length < MAX_FAQS && (
                  <button
                    onClick={() => set({ faqs: [...editing.page.faqs, { q: "", a: "" }] })}
                    className="mt-2 text-sm font-semibold text-primary underline"
                  >
                    + Add FAQ
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium">Clinical review</p>
                <p className="text-xs text-foreground/60">
                  Only Published pages are public. Approving or publishing needs the reviewer's
                  details, which are shown on the page.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SEO_STATUSES.map((st, i) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => set({ status: st, published: st === "published" })}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold ${editing.page.status === st ? "bg-primary text-primary-foreground" : "border border-border text-foreground/70"}`}
                    >
                      {i + 1}. {STATUS_LABEL[st]}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm font-medium">
                    Reviewer name
                    <input
                      className={field}
                      value={editing.page.reviewer_name}
                      onChange={(e) => set({ reviewer_name: e.target.value })}
                      placeholder="Dr Jane Smith"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Qualifications
                    <input
                      className={field}
                      value={editing.page.reviewer_qualifications}
                      onChange={(e) => set({ reviewer_qualifications: e.target.value })}
                      placeholder="MBACP (Accred)"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Review date
                    <input
                      type="date"
                      className={field}
                      value={editing.page.reviewed_on}
                      onChange={(e) => set({ reviewed_on: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => onPreview()}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
              <button
                disabled={busy}
                onClick={onSave}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-3">
            <span className="text-sm font-semibold">
              {editing ? "Preview: not saved yet" : `Preview: /${preview.page.slug}`}
            </span>
            <button
              onClick={() => setPreview(null)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {editing ? "Back to editing" : "Close preview"}
            </button>
          </div>
          <SeoPageView data={preview} />
        </div>
      )}
    </div>
  );
}

type Section = { heading: string; text: string };

function parseSections(body: string): Section[] {
  const text = body
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!text) return [{ heading: "", text: "" }];
  const out: Section[] = [];
  let cur: Section = { heading: "", text: "" };
  for (const line of text.split("\n")) {
    const m = line.match(/^#{2,3}\s+(.*)$/);
    if (m) {
      if (cur.heading || cur.text.trim()) out.push(cur);
      cur = { heading: m[1].trim(), text: "" };
    } else cur.text += (cur.text ? "\n" : "") + line;
  }
  out.push(cur);
  return out.map((s) => ({ heading: s.heading, text: s.text.trim() }));
}

function joinSections(sections: Section[]): string {
  return sections
    .map((s) =>
      [s.heading.trim() ? `## ${s.heading.trim()}` : "", s.text.trim()]
        .filter(Boolean)
        .join("\n\n"),
    )
    .filter(Boolean)
    .join("\n\n");
}

function SectionsEditor({
  body,
  onChange,
  field,
}: {
  body: string;
  onChange: (b: string) => void;
  field: string;
}) {
  const [sections, setSections] = useState<Section[]>(() => parseSections(body));
  const update = (next: Section[]) => {
    setSections(next);
    onChange(joinSections(next));
  };
  return (
    <div>
      <p className="text-sm font-medium">Main content</p>
      <p className="text-xs text-foreground/60">
        Split the page into sections. Each section has an optional subheading and its text. Press
        Enter twice for a new paragraph; start a line with "- " for a bullet point.
      </p>
      {sections.map((s, i) => (
        <div key={i} className="mt-3 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Section {i + 1}</span>
            <span className="flex gap-3">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const n = [...sections];
                    [n[i - 1], n[i]] = [n[i], n[i - 1]];
                    update(n);
                  }}
                >
                  Move up
                </button>
              )}
              {sections.length > 1 && (
                <button
                  type="button"
                  className="text-destructive"
                  onClick={() => update(sections.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              )}
            </span>
          </div>
          <input
            className={field}
            placeholder="Subheading (optional), e.g. How therapy can help"
            value={s.heading}
            onChange={(e) =>
              update(sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))
            }
          />
          <textarea
            rows={6}
            className={`${field} leading-relaxed`}
            placeholder="Section text"
            value={s.text}
            onChange={(e) =>
              update(sections.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
            }
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...sections, { heading: "", text: "" }])}
        className="mt-2 inline-flex items-center gap-1 text-sm underline"
      >
        <Plus className="h-4 w-4" /> Add section
      </button>
    </div>
  );
}
