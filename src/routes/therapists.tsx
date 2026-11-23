import { createFileRoute, Link, useNavigate, stripSearchParams } from "@tanstack/react-router";
import { BRAND_SHARE_IMAGE_META } from "@/lib/share-image";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { listPublishedTherapists } from "@/lib/therapist-profiles.functions";
import {
  ArrowRight,
  Globe,
  Clock,
  Video,
  MapPin,
  Lock,
  Star,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { supabase } from "@/integrations/supabase/client";
import { getTherapistReviews } from "@/lib/reviews.functions";
import { SORT_OPTIONS, sortTherapists } from "@/lib/therapist-sort";
import { matchesTherapistSearch, showExpertiseSuggestions } from "@/lib/therapist-search";
import { AREA_CATEGORIES, CLIENT_MAX_AREAS } from "@/lib/areas-of-expertise";

type Therapist = {
  id: string;
  slug: string;
  display_name: string;
  title: string | null;
  bio: string | null;
  calendly_url: string | null;
  photo_url?: string | null;
  specialties?: string[] | null;
  languages?: string[] | null;
  years_in_practice?: number | null;
  session_fee_50?: number | null;
  testimonials?: { quote: string; author?: string | null }[] | null;
  intro_video_url?: string | null;
  offers_intro_call?: boolean | null;
  gender?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  review_count?: number | null;
  review_avg?: number | null;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  areas: fallback(z.string().array(), []).default([]),
  open: fallback(z.string().array(), []).default([]),
  gender: fallback(z.string(), "").default(""),
  langs: fallback(z.string().array(), []).default([]),
  intro: fallback(z.boolean(), false).default(false),
  minPrice: fallback(z.number(), 0).default(0),
  maxPrice: fallback(z.number(), 0).default(0),
  minYears: fallback(z.number(), 0).default(0),
  minRating: fallback(z.number(), 0).default(0),
  sort: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/therapists")({
  validateSearch: zodValidator(searchSchema),

  head: () => ({
    meta: [
      ...BRAND_SHARE_IMAGE_META,
      { title: "Browse Therapists — Veyro Health" },
      {
        name: "description",
        content: "Browse Veyro's licensed therapists and book a session — no account required.",
      },
      { property: "og:title", content: "Browse Therapists — Veyro Health" },
      {
        property: "og:description",
        content:
          "Find a licensed therapist and book a session with Veyro Health, with no account required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => listPublishedTherapists(),
  errorComponent: ({ error }) => {
    console.error("[therapists] render error", error);
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-[800px] px-6 py-20 text-center">
          <h1 className="font-serif text-2xl text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-foreground/70">
            We couldn't load the therapist list right now. Please try again in a moment.
          </p>
        </main>
        <Footer />
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[800px] px-6 py-20 text-center">
        <h1 className="font-serif text-2xl text-foreground">Not found</h1>
      </main>
      <Footer />
    </div>
  ),
  component: TherapistsPage,
});

const GENDER_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

function TherapistsPage() {
  const { therapists } = Route.useLoaderData() as { therapists: Therapist[] };
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/therapists" });
  const [selected, setSelected] = useState<Therapist | null>(null);

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), resetScroll: false, replace: true });

  const selectedAreas = search.areas.slice(0, CLIENT_MAX_AREAS);

  // Price bounds come from the therapists' real session prices.
  const [priceFloor, priceCeil] = useMemo(() => {
    const prices = therapists.flatMap((t) =>
      [t.min_price, t.max_price].filter((p): p is number => typeof p === "number" && p > 0),
    );
    if (!prices.length) return [0, 0];
    return [Math.min(...prices), Math.max(...prices)];
  }, [therapists]);

  const minPrice = search.minPrice > 0 ? search.minPrice : priceFloor;
  const maxPrice = search.maxPrice > 0 ? search.maxPrice : priceCeil;
  const priceActive = search.minPrice > 0 || search.maxPrice > 0;

  const allLanguages = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of therapists)
      for (const l of t.languages ?? []) {
        const v = l?.trim();
        if (!v) continue;
        const key = v.toLowerCase();
        if (!map.has(key)) map.set(key, v.charAt(0).toUpperCase() + v.slice(1).toLowerCase());
      }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [therapists]);

  const query = search.q.trim().toLowerCase();

  const filtered = therapists.filter((t) => {
    if (!matchesTherapistSearch(t, query)) return false;

    // Areas of expertise: therapist must cover ALL selected areas.
    if (selectedAreas.length > 0) {
      const s = t.specialties ?? [];
      if (!selectedAreas.every((a) => s.includes(a))) return false;
    }
    if (search.gender && t.gender !== search.gender) return false;
    if (search.langs.length > 0) {
      const ls = (t.languages ?? []).map((l) => l.trim().toLowerCase());
      if (!search.langs.every((l) => ls.includes(l.toLowerCase()))) return false;
    }
    if (search.intro && !t.offers_intro_call) return false;
    if (search.minYears > 0 && (t.years_in_practice ?? 0) < search.minYears) return false;
    if (search.minRating > 0 && (!t.review_count || (t.review_avg ?? 0) < search.minRating))
      return false;
    if (priceActive) {
      const lo = t.min_price;
      const hi = t.max_price;
      if (lo == null || hi == null) return false;
      // Keep therapists who offer at least one session inside the range.
      if (hi < minPrice || lo > maxPrice) return false;
    }
    return true;
  });

  const sorted = sortTherapists(filtered, search.sort);

  const [searchFocused, setSearchFocused] = useState(false);
  const anyFilter =
    !!query ||
    selectedAreas.length > 0 ||
    !!search.gender ||
    search.langs.length > 0 ||
    search.intro ||
    search.minYears > 0 ||
    search.minRating > 0 ||
    priceActive;

  const clearAll = () =>
    navigate({
      search: {
        q: "",
        areas: [],
        open: [],
        gender: "",
        langs: [],
        intro: false,
        minPrice: 0,
        maxPrice: 0,
        minYears: 0,
        minRating: 0,
        sort: search.sort,
      },
      resetScroll: false,
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1100px] px-6 py-12 md:py-16">
        <div className="max-w-2xl">
          <h1 className="font-serif text-3xl text-foreground md:text-4xl">Find your therapist</h1>
          <p className="mt-3 text-base text-foreground/70">
            Browse our licensed therapists and book a session directly. No account needed. Book as a
            guest or create one at checkout.
          </p>
        </div>

        {therapists.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="font-serif text-lg text-foreground">Therapists coming soon</p>
            <p className="mt-2 text-sm text-foreground/70">
              We're onboarding our founding therapists now. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <div className="space-y-4">
                {anyFilter && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm font-medium text-primary hover:bg-accent/40"
                  >
                    Clear all filters
                  </button>
                )}
                <FilterCard
                  title="Free Initial Consultation"
                  onClear={search.intro ? () => setSearch({ intro: false }) : undefined}
                >
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-foreground/80 hover:bg-accent/40">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={search.intro}
                      onChange={() => setSearch({ intro: !search.intro })}
                    />
                    <span>Offers a free initial consultation</span>
                  </label>
                </FilterCard>
                <FilterCard
                  title="Search by name or area of expertise"
                  onClear={query ? () => setSearch({ q: "" }) : undefined}
                >
                  <input
                    type="search"
                    aria-label="Search by therapist name or area of expertise"
                    list={
                      showExpertiseSuggestions(query) ? "expertise-search-suggestions" : undefined
                    }
                    autoComplete="off"
                    value={search.q}
                    onChange={(e) => setSearch({ q: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                        document
                          .getElementById("therapist-results")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    enterKeyHint="search"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                    placeholder="Name or expertise…"
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <datalist id="expertise-search-suggestions">
                    {(showExpertiseSuggestions(query)
                      ? AREA_CATEGORIES.flatMap((category) => category.areas)
                      : []
                    ).map((area) => (
                      <option key={area} value={area} />
                    ))}
                  </datalist>
                  {searchFocused && query && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        (document.activeElement as HTMLElement | null)?.blur();
                        document
                          .getElementById("therapist-results")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="mt-3 w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground lg:hidden"
                    >
                      See {filtered.length} result{filtered.length === 1 ? "" : "s"}
                    </button>
                  )}
                </FilterCard>
                <AreasFilter
                  selected={selectedAreas}
                  onChange={(next) => setSearch({ areas: next })}
                  openCats={search.open}
                  onOpenChange={(next) => setSearch({ open: next })}
                />
                <FilterCard
                  title="Therapist gender"
                  onClear={search.gender ? () => setSearch({ gender: "" }) : undefined}
                >
                  <div className="flex flex-col gap-1">
                    {GENDER_OPTIONS.map((g) => (
                      <label
                        key={g.value || "any"}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-foreground/80 hover:bg-accent/40"
                      >
                        <input
                          type="radio"
                          className="h-3.5 w-3.5 accent-primary"
                          checked={search.gender === g.value}
                          onChange={() => setSearch({ gender: g.value })}
                        />
                        <span>{g.label}</span>
                      </label>
                    ))}
                  </div>
                </FilterCard>
                {allLanguages.length > 1 && (
                  <FilterCard
                    title="Languages"
                    onClear={search.langs.length ? () => setSearch({ langs: [] }) : undefined}
                  >
                    <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                      {allLanguages.map((l) => {
                        const on = search.langs.includes(l);
                        return (
                          <label
                            key={l}
                            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs ${on ? "bg-primary/10 text-foreground" : "text-foreground/80 hover:bg-accent/40"}`}
                          >
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-primary"
                              checked={on}
                              onChange={() =>
                                setSearch({
                                  langs: on
                                    ? search.langs.filter((x) => x !== l)
                                    : [...search.langs, l],
                                })
                              }
                            />
                            <span>{l}</span>
                          </label>
                        );
                      })}
                    </div>
                  </FilterCard>
                )}
              </div>
              {!searchFocused && (anyFilter || query || search.open.length > 0) && (
                <div className="sticky bottom-4 z-30 mt-4 lg:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById("therapist-results")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
                  >
                    See {filtered.length} result{filtered.length === 1 ? "" : "s"}
                  </button>
                </div>
              )}
            </aside>
            <div id="therapist-results" className="scroll-mt-24">
              {search.open.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-accent/30 px-4 py-2.5 text-sm text-foreground/80">
                  <span>Showing {search.open.join(", ")} — tick the areas that apply to you.</span>
                  <button
                    type="button"
                    onClick={() => setSearch({ open: [] })}
                    className="font-semibold text-primary hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span />
                <label className="flex items-center gap-2 text-sm text-foreground/70">
                  Sort by
                  <select
                    value={SORT_OPTIONS.some((o) => o.value === search.sort) ? search.sort : ""}
                    onChange={(e) => setSearch({ sort: e.target.value })}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                  <p className="font-serif text-lg text-foreground">
                    No therapists match your filters
                  </p>
                  <p className="mt-2 text-sm text-foreground/70">
                    Therapists must cover every area you've selected. Removing an area — or widening
                    the price range — will show more results.
                  </p>
                  {anyFilter && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="mt-4 text-sm font-semibold text-primary hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {sorted.map((t: Therapist) => (
                    <TherapistCard key={t.slug} therapist={t} onOpen={() => setSelected(t)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <TherapistDialog
        therapist={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
      <Footer />
    </div>
  );
}

function FilterCard({
  title,
  onClear,
  children,
}: {
  title: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-base text-foreground">{title}</h2>
        {onClear && (
          <Button
            type="button"
            variant="link"
            onClick={onClear}
            className="h-auto shrink-0 p-0 text-xs font-medium"
          >
            Clear
          </Button>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function AreasFilter({
  selected,
  onChange,
  openCats,
  onOpenChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  openCats: string[];
  onOpenChange: (next: string[]) => void;
}) {
  const toggleCat = (label: string) =>
    onOpenChange(
      openCats.includes(label) ? openCats.filter((x) => x !== label) : [...openCats, label],
    );
  const toggleArea = (a: string) => {
    if (selected.includes(a)) {
      onChange(selected.filter((x) => x !== a));
    } else if (selected.length < CLIENT_MAX_AREAS) {
      onChange([...selected, a]);
    }
  };
  const atMax = selected.length >= CLIENT_MAX_AREAS;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-base text-foreground">Areas of Expertise</h2>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mt-1 text-[11px] text-foreground/60">
        {selected.length}/{CLIENT_MAX_AREAS} selected · therapists must cover all of them
      </p>
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground"
            >
              {a}
              <button type="button" onClick={() => toggleArea(a)} aria-label={`Remove ${a}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-1.5">
        {AREA_CATEGORIES.map((cat) => {
          const isOpen = openCats.includes(cat.label);
          const count = cat.areas.filter((a) => selected.includes(a)).length;
          return (
            <div key={cat.label} className="overflow-hidden rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => toggleCat(cat.label)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-accent/40"
              >
                <span className="flex items-center gap-2">
                  {cat.label}
                  {count > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {count}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-foreground/50 transition ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border/60 px-3 py-2">
                  <div className="flex flex-col gap-1">
                    {cat.areas.map((a) => {
                      const on = selected.includes(a);
                      const disabled = !on && atMax;
                      return (
                        <label
                          key={a}
                          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs ${on ? "bg-primary/10 text-foreground" : "text-foreground/80 hover:bg-accent/40"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-primary"
                            checked={on}
                            disabled={disabled}
                            onChange={() => toggleArea(a)}
                          />
                          <span>{a}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TherapistCard({ therapist, onOpen }: { therapist: Therapist; onOpen: () => void }) {
  const initials = getInitials(therapist.display_name);
  const specialities = therapist.specialties ?? [];
  const firstTestimonial =
    therapist.testimonials && therapist.testimonials.length
      ? therapist.testimonials[0].quote
      : null;
  const avatarSrc =
    therapist.photo_url ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(therapist.display_name)}&backgroundType=gradientLinear`;

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`View ${therapist.display_name}'s profile`}
      className="group flex flex-col rounded-2xl border border-border/60 bg-card p-6 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 border border-border/60">
          <AvatarImage src={avatarSrc} alt="" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg leading-tight text-foreground">
            {therapist.display_name}
          </h2>
          {therapist.title && (
            <p className="mt-0.5 text-xs text-foreground/70">{therapist.title}</p>
          )}
          <div className="mt-1.5">
            {(therapist.review_count ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-foreground/80">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span className="font-semibold">{(therapist.review_avg ?? 0).toFixed(1)}</span>
                <span className="text-foreground/55">
                  · {therapist.review_count} review{therapist.review_count === 1 ? "" : "s"}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" /> New on Veyro
              </span>
            )}
          </div>
        </div>
      </div>

      {specialities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {specialities.slice(0, 3).map((s) => (
            <Badge key={s} variant="secondary" className="text-[11px] font-medium">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {firstTestimonial && (
        <blockquote className="mt-4 rounded-lg border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-xs italic text-foreground/75 line-clamp-2">
          “{firstTestimonial}”
        </blockquote>
      )}

      <div className="mt-auto pt-5 flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Book session <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TherapistDialog({
  therapist,
  open,
  onOpenChange,
}: {
  therapist: Therapist | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [session, setSession] = useState<{ email: string | null; name: string | null } | null>(
    null,
  );
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [reviewData, setReviewData] = useState<{
    reviews: Array<{
      id: string;
      rating: number;
      body: string | null;
      traits: string[] | null;
      created_at: string;
    }>;
    traitCounts: Record<string, number>;
    avg: number;
    count: number;
  }>({ reviews: [], traitCounts: {}, avg: 0, count: 0 });

  useEffect(() => {
    if (!open || !therapist?.slug) return;
    let cancelled = false;
    getTherapistReviews({ data: { slug: therapist.slug } })
      .then((r) => {
        if (!cancelled) setReviewData(r as never);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, therapist?.slug]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        const u = data.session.user;
        setSession({
          email: u.email ?? null,
          name:
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.first_name as string) ||
            u.email?.split("@")[0] ||
            null,
        });
      } else {
        setSession(null);
      }
      setSessionLoading(false);
    }
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (s) {
          setSession({
            email: s.user.email ?? null,
            name:
              (s.user.user_metadata?.full_name as string) ||
              (s.user.user_metadata?.first_name as string) ||
              s.user.email?.split("@")[0] ||
              null,
          });
        } else {
          setSession(null);
        }
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) setShowBooking(false);
  }, [open, therapist?.slug]);

  if (!therapist) return null;
  const initials = getInitials(therapist.display_name);
  const specialities = therapist.specialties ?? [];
  const languages = therapist.languages ?? [];
  const years = therapist.years_in_practice;
  const testimonials = therapist.testimonials ?? [];
  const avatarSrc =
    therapist.photo_url ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(therapist.display_name)}&backgroundType=gradientLinear`;
  const bookingRedirect = `/client/signup?redirect=${encodeURIComponent(`/therapists`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-left">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border border-border/60">
              <AvatarImage src={avatarSrc} alt="" />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-serif text-2xl text-foreground">
                {therapist.display_name}
              </DialogTitle>
              {therapist.title && (
                <DialogDescription className="mt-1 text-sm">{therapist.title}</DialogDescription>
              )}
              <Link
                to="/therapist/$slug"
                params={{ slug: therapist.slug }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View full profile <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          {therapist.bio && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                About
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                {therapist.bio}
              </p>
            </section>
          )}

          {specialities.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Areas of Expertise
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {specialities.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {years != null && (
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Experience"
                value={`${years}+ years`}
              />
            )}
            {languages.length > 0 && (
              <InfoRow
                icon={<Globe className="h-4 w-4" />}
                label="Languages"
                value={languages.join(", ")}
              />
            )}
            <InfoRow
              icon={<Video className="h-4 w-4" />}
              label="Sessions"
              value="Online video session"
            />
            {therapist.offers_intro_call && (
              <p className="text-xs text-primary">
                Offers a free 15-minute introductory consultation
              </p>
            )}
          </div>

          {reviewData.count === 0 && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> New on Veyro — no client reviews yet
            </p>
          )}

          {reviewData.count > 0 && (
            <section>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                  Client reviews
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-semibold">{reviewData.avg.toFixed(1)}</span>
                  <span className="text-foreground/60">
                    · {reviewData.count} review{reviewData.count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {Object.keys(reviewData.traitCounts).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(reviewData.traitCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([t, n]) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="border-primary/30 bg-primary/5 text-foreground/80"
                      >
                        {t} · {n}
                      </Badge>
                    ))}
                </div>
              )}
              <ul className="mt-4 space-y-3">
                {reviewData.reviews.slice(0, 4).map((r) => (
                  <li key={r.id} className="rounded-xl border border-border/60 bg-card/50 p-3">
                    <div className="flex items-center gap-1 text-primary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-primary" : "text-foreground/20"}`}
                        />
                      ))}
                      <span className="ml-2 text-[11px] text-foreground/50">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {r.body && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                        {r.body}
                      </p>
                    )}
                    {r.traits && r.traits.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.traits.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {therapist.intro_video_url && (
            <section className="mx-auto max-w-xs">
              <div className="mb-2 flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                  Meet {therapist.display_name.split(" ")[0]}
                </h3>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-[var(--shadow-soft)]">
                <video
                  src={therapist.intro_video_url}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
            </section>
          )}

          {testimonials.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                  What clients say
                </h3>
                <div className="mt-3 space-y-3">
                  {testimonials.map((t, i) => (
                    <blockquote
                      key={i}
                      className="rounded-xl border-l-2 border-primary/50 bg-muted/40 px-4 py-3 text-sm italic text-foreground/85"
                    >
                      “{t.quote}”
                      {t.author && (
                        <footer className="mt-1 not-italic text-xs text-foreground/60">
                          — {t.author}
                        </footer>
                      )}
                    </blockquote>
                  ))}
                </div>
              </section>
            </>
          )}

          <Separator />

          <section>
            <h3 className="font-serif text-xl text-foreground">Book a session</h3>
            {sessionLoading ? (
              <div className="mt-3 rounded-2xl border border-border/60 bg-card p-6 text-center">
                <p className="text-sm text-foreground/70">Checking your account…</p>
              </div>
            ) : showBooking ? (
              <div className="mt-3">
                <BookingWidget
                  therapistId={therapist.id}
                  therapistName={therapist.display_name}
                  clientName={session?.name ?? null}
                  clientEmail={session?.email ?? null}
                  signedIn={!!session}
                />
              </div>
            ) : (
              <div className="mt-3 flex justify-center">
                <Button onClick={() => setShowBooking(true)}>
                  Book session <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>

          <div className="flex justify-end pt-2">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
      <span className="mt-0.5 text-primary" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
          {label}
        </p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
