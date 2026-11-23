import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND_SHARE_IMAGE_META } from "@/lib/share-image";
import {
  ArrowRight,
  HeartHandshake,
  Handshake,
  Users,
  HeartPulse,
  BarChart3,
  Globe2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import heroImg from "@/assets/therapy-fund-hero.jpg";

export const Route = createFileRoute("/therapy-fund")({
  component: TherapyFundPage,
  head: () => ({
    meta: [
      ...BRAND_SHARE_IMAGE_META,
      { title: "The Veyro Therapy Fund — Removing financial barriers to mental health support" },
      {
        name: "description",
        content:
          "The Veyro Therapy Fund helps charities, grant providers, employers and community organisations create dedicated therapy funds that provide accredited mental health support to the people they already exist to help.",
      },
      { property: "og:title", content: "The Veyro Therapy Fund — Veyro" },
      {
        property: "og:description",
        content:
          "Partner with Veyro to create a dedicated therapy fund and provide accredited mental health support to your community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://veyrohealth.com/therapy-fund" }],
  }),
});

const accordionItems = [
  {
    id: "what",
    Icon: HeartHandshake,
    title: "What is the Veyro Therapy Fund?",
    body: (
      <div className="space-y-4">
        <p>
          The Veyro Therapy Fund enables organisations to fund professional mental health support
          for the communities they already serve.
        </p>
        <p>
          Rather than providing funding without a clear pathway into therapy, organisations can
          create their own dedicated Veyro Therapy Fund, allowing eligible individuals to access
          accredited therapists through the Veyro platform.
        </p>
        <p>
          Every organisation remains in control of who they support and how funding is allocated.
        </p>
      </div>
    ),
  },
  {
    id: "how",
    Icon: Handshake,
    title: "How does it work?",
    body: (
      <ol className="space-y-6">
        {[
          {
            n: "1",
            h: "Create a Fund",
            p: "Your organisation creates its own dedicated Veyro Therapy Fund. The fund is used exclusively to support the people your organisation already exists to help.",
          },
          {
            n: "2",
            h: "Applications",
            p: "Applications can either be submitted directly through Veyro or assessed by your own organisation before being referred to us. You decide the eligibility criteria.",
          },
          {
            n: "3",
            h: "Funding Approval",
            p: "Once approved, eligible individuals are matched with an appropriate accredited mental health professional on the Veyro platform.",
          },
          {
            n: "4",
            h: "Therapy Begins",
            p: "Clients receive professional therapy from accredited practitioners whose qualifications and experience match their needs.",
          },
          {
            n: "5",
            h: "Measuring Impact",
            p: "Your organisation receives clear reporting showing the impact your funding has created while maintaining complete client confidentiality.",
          },
        ].map((s) => (
          <li key={s.n} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/60 text-sm font-semibold text-primary">
              {s.n}
            </span>
            <div>
              <h4 className="font-semibold text-primary">{s.h}</h4>
              <p className="mt-1 text-foreground/75">{s.p}</p>
            </div>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "who-create",
    Icon: Users,
    title: "Who can create a Veyro Therapy Fund?",
    body: (
      <div className="space-y-4">
        <p>The programme is suitable for organisations including:</p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            "Charities",
            "Community Organisations",
            "Grant Providers",
            "Employers",
            "Local Authorities",
            "NHS Organisations",
            "Universities",
            "Trusts & Foundations",
          ].map((x) => (
            <li key={x} className="flex items-center gap-2 text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              {x}
            </li>
          ))}
        </ul>
        <p>
          If your organisation supports people experiencing mental health challenges, we&apos;d love
          to speak with you.
        </p>
      </div>
    ),
  },
  {
    id: "who-supported",
    Icon: HeartPulse,
    title: "Who can be supported?",
    body: (
      <div className="space-y-4">
        <p>Every organisation is different.</p>
        <p>
          Your fund can be dedicated entirely to the communities you already exist to support.
          Examples include:
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            "Young People",
            "Veterans",
            "Survivors of Domestic Abuse",
            "Bereavement",
            "LGBTQ+ Communities",
            "Eating Disorders",
            "Carers",
            "Students",
            "People experiencing Financial Hardship",
            "Employees",
            "Families",
            "Any community your organisation supports",
          ].map((x) => (
            <li key={x} className="flex items-center gap-2 text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              {x}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "impact",
    Icon: BarChart3,
    title: "Measuring Your Impact",
    body: (
      <div className="space-y-4">
        <p>
          One of the biggest challenges for organisations is understanding the real-world impact of
          their funding.
        </p>
        <p>
          Every Veyro Therapy Fund includes clear reporting, helping you understand exactly how your
          fund is making a difference.
        </p>
        <p className="font-medium text-primary">Reports may include:</p>
        <ul className="space-y-2">
          {[
            "Number of people supported",
            "Therapy sessions funded",
            "Fund utilisation",
            "Anonymous outcome reporting",
            "Community impact",
          ].map((x) => (
            <li key={x} className="flex items-center gap-2 text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              {x}
            </li>
          ))}
        </ul>
        <p>All reporting is completed whilst maintaining complete client confidentiality.</p>
      </div>
    ),
  },
  {
    id: "why",
    Icon: Globe2,
    title: "Why partner with Veyro?",
    body: (
      <div className="space-y-4">
        <p>We believe access to therapy should be simple, transparent and available to everyone.</p>
        <p>Partnering with Veyro provides:</p>
        <ul className="space-y-2">
          {[
            "Access to professionally accredited therapists",
            "A simple pathway from funding to therapy",
            "Flexible eligibility criteria",
            "Transparent reporting",
            "Measurable community impact",
            "A trusted partner committed to improving access to mental health support",
          ].map((x) => (
            <li key={x} className="flex items-start gap-2 text-foreground/80">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {x}
            </li>
          ))}
        </ul>
        <p className="text-foreground/80">
          Together, we can help more people receive the support they deserve.
        </p>
      </div>
    ),
  },
];

function TherapyFundPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            <span className="inline-flex items-center rounded-full border border-border bg-secondary/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary/80">
              The Veyro Therapy Fund Programme
            </span>
            <h1 className="mt-6 font-serif text-4xl font-semibold leading-[1.05] text-primary sm:text-5xl md:text-[3.75rem]">
              Removing financial barriers to mental health support.
            </h1>
            <div className="mt-6 max-w-md space-y-4 text-base leading-relaxed text-foreground/70">
              <p>Every day, thousands of people are ready to ask for help.</p>
              <p>
                Too often, the biggest barrier isn&apos;t finding the right therapist — it&apos;s
                being able to afford one.
              </p>
              <p>
                The Veyro Therapy Fund helps charities, grant providers, employers and community
                organisations create dedicated therapy funds that provide accredited mental health
                support to the people they already exist to help.
              </p>
            </div>
            <div className="mt-8">
              <a
                href="#partner"
                className="group inline-flex items-center gap-3 rounded-xl bg-primary px-8 py-4 text-base font-semibold tracking-wide text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90"
              >
                Become a Founding Partner
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
          <div className="relative animate-in fade-in zoom-in-95 duration-700">
            <div
              className="relative"
              style={{
                WebkitMaskImage:
                  "radial-gradient(ellipse 78% 78% at 60% 40%, #000 45%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.4) 80%, transparent 100%)",
                maskImage:
                  "radial-gradient(ellipse 78% 78% at 60% 40%, #000 45%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.4) 80%, transparent 100%)",
              }}
            >
              <img
                src={heroImg}
                alt="Sunlit therapy room with cream armchair and plants"
                width={1600}
                height={1024}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission statement */}
      <section className="px-6 pb-4 md:pb-8">
        <div className="mx-auto max-w-[1000px] rounded-3xl border border-border/60 bg-accent/50 p-8 text-center shadow-[var(--shadow-soft)] md:p-12">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary/70">
            Our Mission
          </p>
          <p className="mt-4 font-serif text-2xl leading-snug text-primary md:text-3xl">
            No one should be denied access to mental health support because of their financial
            circumstances.
          </p>
        </div>
      </section>

      {/* Accordions */}
      <section className="px-6 py-12 md:py-16">
        <div className="mx-auto max-w-[900px]">
          <Accordion type="single" collapsible className="space-y-4">
            {accordionItems.map(({ id, Icon, title, body }) => (
              <AccordionItem
                key={id}
                value={id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card px-6 shadow-[var(--shadow-soft)] transition data-[state=open]:shadow-md"
              >
                <AccordionTrigger className="py-6 text-left text-lg font-semibold text-primary hover:no-underline [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-primary/70">
                  <span className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/60 text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.6} />
                    </span>
                    <span className="min-w-0">{title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-8 pl-0 pr-2 text-base leading-relaxed text-foreground/75 md:pl-14">
                  {body}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section id="partner" className="px-6 py-12 md:py-20">
        <div className="mx-auto max-w-[1000px] overflow-hidden rounded-3xl bg-primary p-10 text-center text-primary-foreground shadow-[var(--shadow-soft)] md:p-16">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
            Founding Partners
          </p>
          <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight md:text-5xl">
            Become a Founding Partner
          </h2>
          <div className="mx-auto mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-primary-foreground/85">
            <p>
              We&apos;re currently inviting a small number of organisations to help shape the Veyro
              Therapy Fund ahead of launch.
            </p>
            <p>
              If your organisation shares our vision of improving access to mental health support,
              we&apos;d love to hear from you.
            </p>
          </div>
          <div className="mt-8 flex justify-center">
            <a
              href="mailto:join@veyrohealth.com?subject=Founding%20Partner%20Enquiry"
              className="group inline-flex items-center gap-3 rounded-xl bg-primary-foreground px-8 py-4 text-base font-semibold tracking-wide text-primary shadow-sm transition hover:bg-primary-foreground/90"
            >
              Arrange a Conversation
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
          <p className="mt-6 text-sm text-primary-foreground/70">
            Prefer email?{" "}
            <a
              href="mailto:join@veyrohealth.com"
              className="underline underline-offset-4 hover:text-primary-foreground"
            >
              join@veyrohealth.com
            </a>
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="text-sm text-primary-foreground/70 underline underline-offset-4 hover:text-primary-foreground"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
