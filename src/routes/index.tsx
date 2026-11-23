import { trackClick } from "@/lib/track-click";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  BadgeCheck,
  Compass,
  HeartHandshake,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  Users,
} from "lucide-react";
import heroRoom from "@/assets/hero-room.jpg";
import founderSam from "@/assets/founder-sam.jpg";
import categoryAnxiety from "@/assets/category-anxiety.jpg";
import categoryDepression from "@/assets/category-depression.jpg";
import categoryOcd from "@/assets/category-ocd.jpg";
import categoryPtsd from "@/assets/category-ptsd.jpg";
import categoryGrief from "@/assets/category-grief.jpg";
import categoryFindTherapist from "@/assets/category-find-therapist.jpg";
import categoryLifeChallenges from "@/assets/category-life-challenges.jpg";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ClosedApplications } from "@/components/site/ClosedApplications";
import { MatchingEnquiryPopup } from "@/components/site/MatchingEnquiryPopup";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Veyro — Find the right therapist for what you're going through" },
      {
        name: "description",
        content:
          "Find the right therapist for what you're going through. Browse Veyro's specialist categories and book with trusted, licensed UK therapists.",
      },
      { property: "og:title", content: "Veyro — Find the right therapist" },
      {
        property: "og:description",
        content:
          "Browse Veyro's specialist categories and book with trusted, licensed UK therapists — thoughtfully matched, carefully verified.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://veyrohealth.com/og-image-v4.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Veyro — Better mental healthcare starts with trust." },
      { property: "og:url", content: "https://veyrohealth.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Veyro — Find the right therapist" },
      {
        name: "twitter:description",
        content:
          "Browse Veyro's specialist categories and book with trusted, licensed UK therapists.",
      },
      { name: "twitter:image", content: "https://veyrohealth.com/og-image-v4.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://veyrohealth.com/" }],
  }),
});

/**
 * Each tile opens the directory with the relevant expertise categories already
 * expanded (nothing pre-ticked — the directory requires a therapist to cover
 * every ticked area, so pre-ticking many areas would return nobody).
 */
const categories: {
  Icon: typeof Sparkles;
  title: string;
  desc: string;
  image: string;
  open: string[];
}[] = [
  {
    Icon: Sparkles,
    title: "Mental Health",
    desc: "Addiction, Anxiety, Bipolar Disorder, Depression, Eating Disorders, OCD, Personality Disorders, Self-esteem, Stress & Burnout, Trauma & PTSD",
    image: categoryAnxiety,
    open: [
      "Anxiety & Mood",
      "Personality & Clinical",
      "Eating & Body Image",
      "Addiction & Compulsive Behaviours",
      "Trauma & Recovery",
    ],
  },
  {
    Icon: HeartHandshake,
    title: "Relationships & Family",
    desc: "Children, Couples, Divorce, Family Therapy, Marriage, Parenting, Separation, Teenagers",
    image: categoryDepression,
    open: ["Relationships & Family", "Children & Young People"],
  },
  {
    Icon: Users,
    title: "Neurodiversity & Identity",
    desc: "ADHD, Autism, Dyslexia, Dyspraxia, Gender Identity, LGBTQ+, Neurodivergence",
    image: categoryOcd,
    open: ["Neurodiversity", "Identity & Inclusion"],
  },
  {
    Icon: Compass,
    title: "Life Challenges",
    desc: "Bereavement, Cancer Support, Career, Chronic Illness, Confidence, Fertility, Grief, Loneliness, Menopause, Pregnancy, Redundancy, Retirement, University",
    image: categoryLifeChallenges,
    open: ["Life Challenges", "Physical Health", "Women's Health", "Men's Mental Health"],
  },
  {
    Icon: Sprout,
    title: "Specialist Therapies",
    desc: "CBT, EMDR, DBT, ACT, Integrative, Psychodynamic, Humanistic, Schema Therapy",
    image: categoryGrief,
    open: ["Personality & Clinical", "Trauma & Recovery"],
  },
  {
    Icon: Search,
    title: "Find a Therapist",
    desc: "Adults, Children, Couples, Evening, In Person, Insurance, Languages, Online, Weekend",
    image: categoryFindTherapist,
    open: [],
  },
];

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Categories />
      <FeatureBar />
      <Mission />
      <section id="apply" className="relative overflow-hidden px-6 py-12 md:py-16">
        <ClosedApplications />
      </section>
      <OnlineBanner />
      <Reassurance />
      <CompanyLine />
      <Footer />
      <MatchingEnquiryPopup />
    </main>
  );
}

function Hero() {
  return (
    <section className="px-6 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 shadow-[var(--shadow-soft)]">
          <img
            src={heroRoom}
            alt="Calm interior with natural light"
            className="h-[420px] w-full object-cover md:h-[480px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-xl px-8 md:px-14">
              <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary/80 backdrop-blur">
                Find the right therapist
              </span>
              <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.05] text-primary sm:text-5xl md:text-[3.75rem]">
                Your mental health matters.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/75">
                Find the right therapist for what you&apos;re going through — thoughtfully matched,
                carefully verified.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to="/therapists"
                  search={{ intro: true }}
                  onClick={() => trackClick("book_free_session")}
                  className="group inline-flex items-center justify-center gap-3 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold tracking-wide text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90"
                >
                  Book a Free Session
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/therapists"
                  onClick={() => trackClick("get_matched")}
                  className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-primary bg-background px-7 py-3 text-base font-semibold tracking-wide text-primary transition hover:bg-accent/40"
                >
                  Get Matched
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section id="categories" className="px-6 py-14 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl font-semibold text-primary md:text-4xl">
            What are you looking for support with?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Choose a category below to find therapists who specialise in your needs.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ Icon, title, desc, image, open }) => (
            <Link
              key={title}
              to="/therapists"
              search={{
                open,
                areas: [],
                gender: "",
                langs: [],
                intro: false,
                minPrice: 0,
                maxPrice: 0,
              }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-48 overflow-hidden bg-secondary/40">
                <img
                  src={image}
                  alt={title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-primary/5 to-transparent" />
                <span className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">{title}</h3>
                  <ChevronRight className="h-5 w-5 text-primary/60 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reassurance() {
  return (
    <section className="px-6 pb-16 md:pb-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col items-start gap-5 rounded-2xl border border-border/60 bg-secondary/60 p-6 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <div>
              <h3 className="font-serif text-xl font-semibold text-primary">
                You&apos;re not alone.
              </h3>
              <p className="mt-1 text-sm text-foreground/75">
                Our verified therapists are here to support you, every step of the way.
              </p>
            </div>
          </div>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Learn More
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function OnlineBanner() {
  return (
    <section className="px-6 pb-4 md:pb-6">
      <div className="mx-auto max-w-[1200px] text-center">
        <p className="text-sm font-medium text-primary/80">
          Access therapy online from anywhere in the UK
        </p>
      </div>
    </section>
  );
}

function CompanyLine() {
  return (
    <section className="px-6 pb-6">
      <div className="mx-auto max-w-[1200px] text-center">
        <p className="text-xs text-muted-foreground">Operated by Veyro Health LTD</p>
      </div>
    </section>
  );
}

function FeatureBar() {
  const items = [
    {
      Icon: Users,
      title: "Built with therapists",
      desc: "Designed alongside practitioners who understand modern private practice.",
    },
    {
      Icon: HeartHandshake,
      title: "Human-first matching",
      desc: "Helping the right clients find the right therapists.",
    },
    {
      Icon: TrendingUp,
      title: "Designed for growth",
      desc: "Tools and visibility to help you grow a sustainable practice.",
    },
    {
      Icon: BadgeCheck,
      title: "Trusted, not transactional",
      desc: "A platform built on quality, trust, and long-term relationships.",
    },
  ];
  return (
    <section className="px-6 pb-12 md:pb-16">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border/60 bg-border/60 shadow-[var(--shadow-soft)] sm:grid-cols-2 md:grid-cols-4">
          {items.map(({ Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center bg-card p-8 text-center">
              <Icon className="h-7 w-7 text-primary/80" strokeWidth={1.5} />
              <h3 className="mt-4 text-base font-semibold text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Mission() {
  return (
    <section className="px-6 py-12 md:py-16">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border/60 shadow-[var(--shadow-soft)]">
          <img
            src={founderSam}
            alt="Sam, founder of Veyro"
            width={1024}
            height={1024}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Our Mission
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-primary md:text-5xl">
            Why we&apos;re building Veyro
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground/75">
            <p>
              We believe mental healthcare should feel more human, more trusted, and more accessible
              — for both clients and therapists.
            </p>
            <p>
              Veyro is being built to create a better way to connect people with the right care.
            </p>
          </div>
          <p
            className="mt-8 text-3xl text-primary"
            style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive' }}
          >
            Sam
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Sam — Founder &amp; CEO</p>
        </div>
      </div>
    </section>
  );
}
