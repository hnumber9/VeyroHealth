import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Stethoscope,
  HeartHandshake,
  Briefcase,
  Users,
  Sparkles,
  Palette,
  ShieldCheck,
  Video,
  UserCheck,
  CalendarCheck,
  Percent,
  PiggyBank,
  Check,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PartnerEnquiryForm } from "@/components/partners/PartnerEnquiryForm";
import introVideo from "@/assets/veyro-white-label-intro.mp4.asset.json";
import introPoster from "@/assets/veyro-white-label-intro-poster.jpg.asset.json";

const TITLE = "Partner with Veyro | White-Label Online Therapy Platform";
const DESCRIPTION =
  "Offer your own branded online therapy service, powered by Veyro's network of qualified, insured therapists. No monthly platform fees for founding partners in their first 12 months.";
const POSTER_ABS = `https://veyrohealth.com${introPoster.url}`;

export const Route = createFileRoute("/partners")({
  component: PartnersPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Your Brand. Your People. Powered by Veyro." },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://veyrohealth.com/partners" },
      { property: "og:image", content: POSTER_ABS },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: POSTER_ABS },
    ],
    links: [{ rel: "canonical", href: "https://veyrohealth.com/partners" }],
  }),
});

function track(location: string) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    event: "cta_click",
    cta_name: "partners_register_interest",
    cta_location: location,
  });
}

function RegisterButton({ location, inverted = false }: { location: string; inverted?: boolean }) {
  return (
    <a
      href="#register"
      onClick={() => track(location)}
      className={`group inline-flex items-center gap-3 rounded-xl px-8 py-4 text-base font-semibold tracking-wide shadow-[var(--shadow-soft)] transition ${
        inverted
          ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      Register Your Interest
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary/70">
      {children}
    </p>
  );
}

const AUDIENCES = [
  {
    Icon: Building2,
    title: "Private Hospitals & Healthcare Clinics",
    body: "Extend your patient services by offering access to professional online therapy without needing to recruit or manage your own therapist network.",
  },
  {
    Icon: Stethoscope,
    title: "GP Practices & Medical Groups",
    body: "Provide patients with a straightforward route to qualified therapists through a platform branded around your practice.",
  },
  {
    Icon: HeartHandshake,
    title: "Care Homes & Care Providers",
    body: "Support the mental health and wellbeing of employees through confidential access to professional online therapy.",
  },
  {
    Icon: Briefcase,
    title: "Corporate Employers",
    body: "Introduce a branded employee wellbeing service, with the future option to contribute towards the cost of employees' therapy sessions.",
  },
  {
    Icon: Users,
    title: "Membership Organisations & Professional Associations",
    body: "Offer members access to professional mental health support as an additional benefit of membership.",
  },
  {
    Icon: Sparkles,
    title: "Wellbeing & Employee Benefits Providers",
    body: "Expand your existing services with a branded therapy platform powered by Veyro's technology and therapist network.",
  },
];

const FEATURES = [
  {
    Icon: Palette,
    title: "Your Own Branding",
    body: "Offer an online therapy platform featuring your organisation's identity, with options to integrate it into your existing website.",
  },
  {
    Icon: ShieldCheck,
    title: "Qualified, Insured Therapists",
    body: "Access Veyro's growing network of over 500 registered therapists, with more than 125 approved and live across a wide range of specialisms.",
  },
  {
    Icon: Video,
    title: "Professional Online Therapy",
    body: "Connect patients, employees or members with qualified human therapists who deliver sessions remotely.",
  },
  {
    Icon: UserCheck,
    title: "Therapist Selection",
    body: "Choose which therapists are available through your branded platform, allowing you to tailor the service to your organisation's needs.",
  },
  {
    Icon: CalendarCheck,
    title: "Appointment Booking & Payments",
    body: "Veyro provides the technology to support therapist discovery, appointment scheduling and secure payments.",
  },
  {
    Icon: Percent,
    title: "Flexible Commission Sharing",
    body: "Partners can benefit from agreed commission-sharing arrangements, creating the potential for an additional revenue stream through therapy bookings.",
  },
  {
    Icon: PiggyBank,
    title: "Corporate Contributions",
    body: "For employers, we're developing functionality that will allow organisations to contribute towards the cost of employees' therapy sessions.",
  },
];

const STEPS = [
  {
    title: "Register Your Interest",
    body: "Tell us a little about your organisation and how you'd like to use the platform.",
  },
  {
    title: "Explore the Opportunity",
    body: "We'll arrange a brief introductory discussion to understand your requirements and explain how the partnership could work.",
  },
  {
    title: "Configure Your Platform",
    body: "Together, we'll agree on branding, therapist availability, commercial arrangements and any relevant integrations.",
  },
  {
    title: "Launch Your Service",
    body: "Once the required functionality and onboarding are complete, your organisation can introduce professional online therapy to its audience, supported by Veyro.",
  },
];

const BENEFITS = [
  "No monthly platform subscription fees for your first 12 months.",
  "Early access to our white-label platform as functionality becomes available.",
  "The opportunity to help shape the platform around your organisation's requirements.",
  "Flexible commission-sharing arrangements.",
  "Support from the Veyro team during onboarding.",
];

function PartnersPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* 1 — Introduction */}
      <section className="px-6">
        <div className="mx-auto max-w-[1000px] py-14 text-center md:py-24 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <span className="inline-flex items-center rounded-full border border-border bg-secondary/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary/80">
            Veyro Partnerships
          </span>
          <h1 className="mt-6 font-serif text-4xl font-semibold leading-[1.05] text-primary sm:text-5xl md:text-[4.25rem]">
            Your Brand. Your People.
            <br className="hidden sm:block" /> Powered by Veyro.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-primary/80 md:text-xl">
            Bring professional online mental health support to your organisation.
          </p>
          <div className="mx-auto mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-foreground/70">
            <p>
              Veyro Health is developing a white-label mental health platform that enables
              organisations to offer their own branded online therapy service, without the cost or
              complexity of building and managing the technology themselves.
            </p>
            <p>
              Whether you&apos;re supporting patients, employees, members or customers, Veyro
              provides access to a growing network of qualified, insured therapists through a
              platform designed around your organisation.
            </p>
            <p>
              With flexible commercial arrangements and no monthly platform fees for our founding
              partners during their first 12 months, we&apos;re making it easier for organisations
              to introduce professional mental health support.
            </p>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-foreground/60 md:text-base">
            We&rsquo;re registering interest ahead of launch, so we can understand your
            organisation&rsquo;s needs and plan your rollout together. Registering your interest
            carries no commitment.
          </p>
          <div className="mt-6">
            <RegisterButton location="partners_hero" />
          </div>
        </div>
      </section>

      {/* 2 — Video */}
      <section className="px-6 pb-14 md:pb-24">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center">
            <Eyebrow>Introduction video</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-primary md:text-5xl">
              Discover What&apos;s Possible with Veyro
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-foreground/70">
              See how your organisation could offer its own branded online therapy platform, powered
              by Veyro.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-primary shadow-[var(--shadow-soft)]">
            <video
              controls
              playsInline
              preload="metadata"
              poster={introPoster.url}
              className="aspect-video h-auto w-full"
              aria-label="Veyro white-label platform introduction video"
            >
              <source src={introVideo.url} type="video/mp4" />
              Your browser doesn&apos;t support embedded video.
            </video>
          </div>
        </div>
      </section>

      {/* 3 — Who it's for */}
      <section className="bg-secondary/40 px-6 py-14 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Who is Veyro for?</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-primary md:text-5xl">
              Designed for Organisations That Want to Make Mental Health Support More Accessible
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/60 bg-card p-7 shadow-[var(--shadow-soft)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/60 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-foreground/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — What the platform offers */}
      <section className="px-6 py-14 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>What does the platform offer?</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-primary md:text-5xl">
              Your Platform. Our Technology.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-primary">{title}</h3>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-foreground/70">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border/60 bg-secondary/50 px-6 py-4 text-center text-sm leading-relaxed text-foreground/65">
            Selected white-label management, payment and employer contribution features are
            currently in development and will be introduced as part of our phased rollout.
          </p>
        </div>
      </section>

      {/* 5 — How it works */}
      <section className="bg-secondary/40 px-6 py-14 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>How does it work?</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-primary md:text-5xl">
              A Straightforward Partnership, Built Around Your Organisation
            </h2>
          </div>
          <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="relative rounded-2xl border border-border/60 bg-card p-7 shadow-[var(--shadow-soft)]"
              >
                <span className="font-serif text-5xl font-semibold leading-none text-primary/25">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-primary">{s.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-foreground/70">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 — Founding Partner Programme */}
      <section className="px-6 py-14 md:py-24">
        <div className="mx-auto max-w-[1100px] overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-[var(--shadow-soft)] md:p-14">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1.1fr] md:items-start">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
                Founding Partner Programme
              </p>
              <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight md:text-5xl">
                Become a Veyro Founding Partner
              </h2>
              <p className="mt-5 text-base leading-relaxed text-primary-foreground/85">
                We&apos;re inviting a select number of organisations to register their interest in
                our initial white-label partnership programme.
              </p>
              <p className="mt-4 text-base font-medium text-primary-foreground">
                There is no obligation to proceed simply by registering your interest.
              </p>
              <div className="mt-8">
                <RegisterButton location="partners_founding" inverted />
              </div>
            </div>
            <div>
              <p className="font-semibold">As a founding partner, you&apos;ll benefit from:</p>
              <ul className="mt-4 space-y-3">
                {BENEFITS.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 rounded-xl bg-primary-foreground/10 px-4 py-3 text-[0.95rem] leading-relaxed"
                  >
                    <Check className="mt-0.5 h-5 w-5 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs leading-relaxed text-primary-foreground/70">
                Therapy sessions remain chargeable. Commission-sharing arrangements and any other
                commercial terms will be agreed individually before launch. Any subscription
                arrangements after the initial 12 months will be agreed in advance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7 — Register interest */}
      <section id="register" className="scroll-mt-24 bg-secondary/40 px-6 py-14 md:py-24">
        <div className="mx-auto max-w-[900px]">
          <div className="text-center">
            <Eyebrow>Register your interest</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-primary md:text-5xl">
              Let&apos;s Explore a Partnership
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-foreground/70">
              Interested in offering professional online therapy under your own brand? Complete the
              short form below and a member of our team will be in touch to discuss how Veyro could
              work for your organisation.
            </p>
          </div>
          <div className="mt-10">
            <PartnerEnquiryForm />
          </div>
        </div>
      </section>

      {/* 8 — Final message */}
      <section className="px-6 py-16 md:py-28">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-primary md:text-5xl">
            Building the Future of Mental Healthcare, Together
          </h2>
          <div className="mx-auto mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-foreground/70">
            <p>
              At Veyro Health, we believe professional mental health support should be easier to
              access and simpler for organisations to offer.
            </p>
            <p>
              By combining qualified therapists, technology and flexible partnerships, we&apos;re
              working towards a future where more people can access the support they need.
            </p>
          </div>
          <p className="mt-8 font-serif text-2xl font-semibold text-primary md:text-3xl">
            Your Brand. Your People. Powered by Veyro.
          </p>
          <div className="mt-8">
            <RegisterButton location="partners_footer" />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
