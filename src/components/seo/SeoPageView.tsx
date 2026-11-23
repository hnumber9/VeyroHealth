import { RichInline } from "@/lib/seo-rich-text";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Lock,
  ShieldCheck,
  Video,
} from "lucide-react";
import { specialityLabel, type SeoFaq, type SeoTherapistCard } from "@/lib/seo-pages";
import imgAnxiety from "@/assets/category-anxiety.jpg";
import imgDepression from "@/assets/category-depression.jpg";
import imgEating from "@/assets/category-eating.jpg";
import imgGrief from "@/assets/category-grief.jpg";
import imgOcd from "@/assets/category-ocd.jpg";
import imgPtsd from "@/assets/category-ptsd.jpg";
import imgLife from "@/assets/category-life-challenges.jpg";
import imgFind from "@/assets/category-find-therapist.jpg";
import imgRoom from "@/assets/hero-room.jpg";

export type SeoViewData = {
  page: {
    slug: string;
    h1: string;
    therapist_section_heading?: string;
    intro: string;
    body: string;
    faqs: SeoFaq[];
    areas: string[];
    therapy_approaches?: string[];
    reviewer_name?: string;
    reviewer_qualifications?: string;
    reviewed_on?: string;
  };
  /** Only therapists who selected one of the page's areas. */
  therapists: SeoTherapistCard[];
  /** Other therapists, shown in a separate broader-support section. */
  broader: SeoTherapistCard[];
  related: { slug: string; h1: string }[];
};

const IMAGE_RULES: [RegExp, string][] = [
  [/anxi|panic|stress|phobia/, imgAnxiety],
  [/depress|mood|low/, imgDepression],
  [/eating|bulim|anorex|body/, imgEating],
  [/grief|bereave|loss/, imgGrief],
  [/ocd|obsess/, imgOcd],
  [/ptsd|trauma|emdr/, imgPtsd],
  [/couple|relationship|family|men|women|work|life|career/, imgLife],
];

/** Picks a topical photo from the page's slug, heading and expertise areas. */
function pickImage(page: SeoViewData["page"]) {
  const hay = `${page.slug} ${page.h1} ${page.areas.join(" ")}`.toLowerCase();
  return IMAGE_RULES.find(([re]) => re.test(hay))?.[1] ?? imgFind;
}

/** Light formatting: "## " subheadings, "- " bullets, blank lines split paragraphs. */
function Body({ text }: { text: string }) {
  // Tolerate content saved with literal "\n" sequences (e.g. pasted from CSV/JSON).
  const normalised = text.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n/g, "\n");
  const blocks = normalised
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <>
      {blocks.map((b, i) => {
        if (/^#{2,3} /.test(b)) {
          return (
            <h2
              key={i}
              className="mt-12 font-serif text-2xl font-semibold text-primary first:mt-0 md:text-3xl"
            >
              {b.replace(/^#{2,3} /, "")}
            </h2>
          );
        }
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*•] /.test(l.trim()))) {
          return (
            <ul key={i} className="mt-5 space-y-2.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3">
                  <span
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                  <span>
                    <RichInline text={l.trim().slice(2)} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mt-5 whitespace-pre-line first:mt-0">
            <RichInline text={b} />
          </p>
        );
      })}
    </>
  );
}

const TRUST = [
  { Icon: ShieldCheck, text: "Every profile checked by our team" },
  { Icon: Video, text: "Secure online sessions" },
  { Icon: CalendarCheck, text: "Book in minutes" },
  { Icon: Lock, text: "No account needed" },
];

export function SeoPageView({ data }: { data: SeoViewData }) {
  const { page, therapists, broader, related } = data;
  const findSearch = { areas: page.areas.slice(0, 1) };
  const image = pickImage(page);
  const speciality = specialityLabel(page.areas, page.h1);

  return (
    <article>
      {/* Hero */}
      <header className="bg-secondary/40">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-sm text-foreground/60">
                <li>
                  <Link to="/" className="hover:text-primary">
                    Home
                  </Link>
                </li>
                <li aria-hidden>
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li>
                  <Link to="/therapists" className="hover:text-primary">
                    Therapists
                  </Link>
                </li>
                <li aria-hidden>
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li aria-current="page" className="truncate text-foreground/80">
                  {page.h1}
                </li>
              </ol>
            </nav>
            <h1 className="mt-6 font-serif text-4xl font-semibold leading-[1.05] text-primary md:text-6xl">
              {page.h1}
            </h1>
            {page.intro && (
              <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-foreground/80">
                <RichInline text={page.intro} />
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/therapists"
                search={findSearch as never}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Find a therapist <ArrowRight className="h-4 w-4" />
              </Link>
              {therapists.length > 0 && (
                <a
                  href="#therapists"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
                >
                  See matching therapists
                </a>
              )}
            </div>
          </div>
          <img
            src={image}
            alt={`Online therapy session on Veyro: ${page.h1}`}
            width={720}
            height={540}
            fetchPriority="high"
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lg"
          />
        </div>
        <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-4 border-t border-border/60 px-6 py-5 text-sm text-foreground/75 md:grid-cols-4">
          {TRUST.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-primary" /> {text}
            </li>
          ))}
        </ul>
      </header>

      {/* Body + sticky sidebar */}
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-14 md:grid-cols-[1fr_300px] md:py-20">
        <div className="max-w-[720px] text-base leading-relaxed text-foreground/80 md:text-lg">
          {page.body && <Body text={page.body} />}
          {!!page.therapy_approaches?.length && (
            <section
              className="mt-12 border-t border-border pt-8"
              aria-labelledby="therapy-approaches-heading"
            >
              <h2
                id="therapy-approaches-heading"
                className="font-serif text-2xl font-semibold text-primary md:text-3xl"
              >
                Therapy approaches we recommend
              </h2>
              <ul className="mt-5 space-y-2">
                {page.therapy_approaches.map((approach) => (
                  <li key={approach}>{approach}</li>
                ))}
              </ul>
            </section>
          )}
          {page.reviewer_name && (
            <p className="mt-10 flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-foreground/70">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Clinically reviewed by{" "}
                <strong className="text-foreground">{page.reviewer_name}</strong>
                {page.reviewer_qualifications && `, ${page.reviewer_qualifications}`}
                {page.reviewed_on &&
                  ` on ${new Date(page.reviewed_on + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                .
              </span>
            </p>
          )}
        </div>
        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <img
              src={imgRoom}
              alt=""
              loading="lazy"
              width={300}
              height={160}
              className="h-32 w-full rounded-2xl object-cover"
            />
            <p className="mt-5 font-serif text-xl font-semibold text-primary">
              Talk to someone who understands
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              Some therapists offer a free introductory consultation.
            </p>
            <Link
              to="/therapists"
              search={findSearch as never}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Browse therapists <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Therapists: exact speciality matches only */}
      <section id="therapists" className="scroll-mt-24 bg-secondary/30 py-14 md:py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <h2 className="font-serif text-3xl font-semibold text-primary md:text-4xl">
            {page.therapist_section_heading?.trim() ||
              `Therapists who can help with ${page.h1.replace(/^(online\s+)?therapy for /i, "").toLowerCase()}`}
          </h2>
          {therapists.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {therapists.map((t) => (
                <TherapistCardLink key={t.slug} t={t} />
              ))}
            </div>
          ) : (
            <p className="mt-6 max-w-2xl text-foreground/75">
              No therapists currently listed on Veyro have selected {speciality} as an area of
              support.
            </p>
          )}
          {broader.length > 0 && (
            <div className="mt-14 border-t border-border pt-10">
              <h3 className="font-serif text-2xl font-semibold text-primary md:text-3xl">
                Therapists offering broader support
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-foreground/70">
                These therapists haven't selected {speciality} as an area of support. They offer
                broader therapeutic support and may still be able to help.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {broader.map((t) => (
                  <TherapistCardLink key={t.slug} t={t} />
                ))}
              </div>
            </div>
          )}
          <Link
            to="/therapists"
            search={findSearch as never}
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            See all therapists <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1200px] px-6 py-14 md:py-20">
        <h2 className="font-serif text-3xl font-semibold text-primary md:text-4xl">
          How Veyro works
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Browse", "Filter by what you need help with, price, gender, language and more."],
            ["Book", "Pick a time that suits you and pay securely. No account needed."],
            ["Talk", "Meet your therapist online from wherever you feel comfortable."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-3xl border border-border bg-card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <p className="mt-4 font-serif text-xl font-semibold text-foreground">{t}</p>
              <p className="mt-1 text-sm text-foreground/70">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {page.faqs.length > 0 && (
        <section className="mx-auto max-w-[880px] px-6 pb-14 md:pb-20">
          <h2 className="font-serif text-3xl font-semibold text-primary md:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-8 divide-y divide-border rounded-3xl border border-border bg-card">
            {page.faqs.map((f, i) => (
              <details key={i} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground">
                  <h3 className="text-base md:text-lg">{f.q}</h3>
                  <ChevronDown className="h-5 w-5 shrink-0 text-primary transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 whitespace-pre-line text-foreground/80">
                  <RichInline text={f.a} />
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <nav aria-label="Related topics" className="mx-auto max-w-[1200px] px-6 pb-14">
          <h2 className="font-serif text-2xl font-semibold text-primary">Related topics</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                to="/$slug"
                params={{ slug: r.slug }}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground/80 hover:border-primary hover:text-primary"
              >
                {r.h1}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <section className="mx-auto max-w-[1200px] px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-center text-primary-foreground md:p-14">
          <h2 className="font-serif text-3xl md:text-4xl">Ready to talk to someone?</h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">
            Browse qualified therapists and book online today.
          </p>
          <Link
            to="/therapists"
            search={findSearch as never}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-primary"
          >
            Find your therapist <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </article>
  );
}

function TherapistCardLink({ t }: { t: SeoTherapistCard }) {
  return (
    <Link
      key={t.slug}
      to="/therapist/$slug"
      params={{ slug: t.slug }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {t.photo_url ? (
        <img
          src={t.photo_url}
          alt={`${t.display_name}, therapist`}
          loading="lazy"
          width={400}
          height={300}
          className="aspect-[4/3] max-h-44 w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] max-h-44 w-full items-center justify-center bg-secondary font-serif text-4xl text-foreground/50">
          {t.display_name.charAt(0)}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="font-serif text-lg font-semibold text-foreground">{t.display_name}</p>
        {t.title && <p className="text-sm text-foreground/70">{t.title}</p>}
        {t.matched.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {t.matched.slice(0, 3).map((m) => (
              <span
                key={m}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
              >
                {m}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <span className="font-medium text-foreground/70">
            {t.min_price != null && t.min_price > 0 ? `From £${t.min_price}` : ""}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            View profile <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
