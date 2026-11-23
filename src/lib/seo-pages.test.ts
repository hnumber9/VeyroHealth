import { describe, expect, it } from "vitest";
import {
  csvToRows,
  emptyPage,
  pagesToCsv,
  pickSeoTherapists,
  specialityLabel,
  validatePage,
} from "./seo-pages";
import { sortTherapists } from "./therapist-sort";

const page = (over = {}) => ({
  ...emptyPage(),
  slug: "therapy-for-anxiety",
  seo_title: "T",
  h1: "H",
  ...over,
});

describe("SEO page rules", () => {
  it("rejects web addresses the site already uses", () => {
    expect(validatePage(page({ slug: "therapists" }))).toMatch(/already used/);
    expect(validatePage(page({ slug: "about" }))).toMatch(/already used/);
  });

  it("rejects badly formed web addresses", () => {
    expect(validatePage(page({ slug: "Therapy For Anxiety" }))).toMatch(/lowercase/);
  });

  it("caps FAQs at 10", () => {
    const faqs = Array.from({ length: 11 }, () => ({ q: "q", a: "a" }));
    expect(validatePage(page({ faqs }))).toMatch(/max 10/);
  });

  it("round-trips a page through the spreadsheet format", () => {
    const p = page({
      areas: ["Anxiety", "Panic Attacks"],
      therapy_approaches: ["Integrative therapy", "Cognitive behavioural therapy (CBT)"],
      related_slugs: ["adhd-therapy"],
      faqs: [{ q: "Q, with comma", a: "A\nline" }],
      published: true,
      status: "published" as const,
      reviewer_name: "Dr A",
      reviewer_qualifications: "MBACP",
      reviewed_on: "2026-10-27",
    });
    const { rows } = csvToRows(pagesToCsv([p]));
    expect(rows[0].page).toEqual(p);
  });

  it("flags duplicate web addresses within one upload", () => {
    const csv = pagesToCsv([page(), page()]);
    const { rows } = csvToRows(csv);
    expect(rows[1].error).toMatch(/more than once/);
  });

  it("keeps uploaded pages hidden unless marked live", () => {
    const { rows } = csvToRows("slug,seo_title,h1\nadhd-therapy,T,H");
    expect(rows[0].page?.published).toBe(false);
    expect(rows[0].page?.status).toBe("draft");
    expect(rows[0].page?.therapy_approaches).toEqual([]);
    expect(rows[0].page?.therapist_section_heading).toBe("");
  });

  it("won't approve or publish a page without a clinical reviewer", () => {
    expect(validatePage(page({ status: "approved" }))).toMatch(/reviewing therapist/);
    expect(
      validatePage(
        page({ status: "published", reviewer_name: "Dr A", reviewer_qualifications: "MBACP" }),
      ),
    ).toMatch(/review date/);
    expect(
      validatePage(
        page({
          status: "published",
          reviewer_name: "Dr A",
          reviewer_qualifications: "MBACP",
          reviewed_on: "2026-10-27",
        }),
      ),
    ).toBeNull();
  });

  it("drafts and clinical review pages need no reviewer yet", () => {
    expect(validatePage(page({ status: "clinical_review" }))).toBeNull();
  });

  it("preserves optional therapist heading data through CSV import and export", () => {
    const p = page({ therapist_section_heading: "Find therapists offering online OCD therapy" });
    expect(csvToRows(pagesToCsv([p])).rows[0].page).toEqual(p);
  });
});

describe("therapist sort", () => {
  const list = [
    { id: "a", min_price: 80, years_in_practice: 5 },
    { id: "b", min_price: null, years_in_practice: 20 },
    { id: "c", min_price: 50, years_in_practice: null },
  ];
  it("price low to high puts unpriced therapists last", () => {
    expect(sortTherapists(list, "price-asc").map((t) => t.id)).toEqual(["c", "a", "b"]);
  });
  it("most experienced first", () => {
    expect(sortTherapists(list, "experience").map((t) => t.id)).toEqual(["b", "a", "c"]);
  });
});

describe("pickSeoTherapists", () => {
  const t = (slug: string, specialties: string[], approved_at = "2026-01-01") => ({
    slug,
    display_name: slug,
    specialties,
    approved_at,
  });

  it("never puts non-matching therapists in the speciality list", () => {
    const all = [t("a", ["Dyspraxia"]), t("b", ["Anxiety"]), t("c", ["Depression"])];
    const { matched, broader } = pickSeoTherapists(all, ["Dyspraxia"]);
    expect(matched.map((m) => m.t.slug)).toEqual(["a"]);
    expect(broader.map((b) => b.slug)).not.toContain("a");
    expect(broader.length).toBe(2);
  });

  it("returns no speciality matches when nobody selected it", () => {
    const { matched } = pickSeoTherapists([t("b", ["Anxiety"])], ["Dyscalculia"]);
    expect(matched).toEqual([]);
  });

  it("caps exact matches at six and skips broader support when there are enough", () => {
    const all = Array.from({ length: 9 }, (_, i) => t(`t${i}`, ["Gaming"]));
    const { matched, broader } = pickSeoTherapists(all, ["gaming"]);
    expect(matched.length).toBe(6);
    expect(broader).toEqual([]);
  });

  it("names the speciality for the empty message", () => {
    expect(specialityLabel(["Schizophrenia Support"], "Therapy for Schizophrenia")).toBe(
      "Schizophrenia Support",
    );
  });
});
