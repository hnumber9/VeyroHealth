// Directory sort options; shared by the search page and its tests.

export const SORT_OPTIONS = [
  { value: "", label: "Most experienced" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

type Sortable = {
  min_price?: number | null;
  years_in_practice?: number | null;
  review_avg?: number | null;
  review_count?: number | null;
  approved_at?: string | null;
};

/** Orders therapists for the chosen sort; missing values always go last. */
export function sortTherapists<T extends Sortable>(list: T[], sort: string): T[] {
  const last = (v: number | null | undefined, dir: 1 | -1) => (v == null ? Infinity : dir * v);
  const by: Record<string, (t: T) => number> = {
    "price-asc": (t) => last(t.min_price, 1),
    "price-desc": (t) => last(t.min_price, -1),
    experience: (t) => last(t.years_in_practice, -1),
    rating: (t) => (t.review_count ? -(t.review_avg ?? 0) : Infinity),
    newest: (t) => last(t.approved_at ? Date.parse(t.approved_at) : null, -1),
  };
  const key = by[sort || "experience"];
  if (!key) return list;
  return list
    .map((t, i) => ({ t, i, k: key(t) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.t);
}
