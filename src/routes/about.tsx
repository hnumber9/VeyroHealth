import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND_SHARE_IMAGE_META } from "@/lib/share-image";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      ...BRAND_SHARE_IMAGE_META,
      { title: "About — Veyro" },
      {
        name: "description",
        content: "Learn more about Veyro, our mission, and the team behind the platform.",
      },
      { property: "og:title", content: "About — Veyro" },
      {
        property: "og:description",
        content: "Learn more about Veyro, our mission, and the team behind the platform.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <article className="mx-auto max-w-[800px] px-6 py-12 md:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="mt-8">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            About
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.05] text-primary md:text-6xl">
            About Veyro
          </h1>
        </header>

        <div className="prose-veyro mt-10 space-y-6 text-base leading-relaxed text-foreground/80">
          <p>Mental healthcare should feel more human.</p>
          <p>
            Finding the right therapist can be one of the most important decisions a person makes,
            yet for many people the process feels overwhelming.
          </p>
          <p>
            Clients are often presented with hundreds of profiles, unfamiliar terminology, and
            difficult decisions at a time when they may already be struggling. At the same time,
            many therapists work incredibly hard to build their practices, often investing
            significant time and money into marketing themselves without any certainty that they
            will reach the people they are best placed to help.
          </p>
          <p>We believe there is a better way.</p>

          <Section title="Why we built Veyro">
            <p>
              Veyro was created with a simple mission:
              <br />
              <em>To make mental healthcare more trusted, human, and accessible.</em>
            </p>
            <p>
              We're building an online platform that helps people connect with the right therapist
              while giving practitioners the tools they need to grow and manage their practice.
            </p>
            <p>
              Our goal is not simply to create another therapist directory. We're developing a
              platform that combines therapist discovery, client matching, secure practice
              management tools, and a better overall experience for both therapists and clients.
            </p>
            <p>
              By reducing friction, increasing trust, and helping people make more confident
              decisions, we hope to improve access to mental healthcare for everyone.
            </p>
          </Section>

          <Section title="Built alongside therapists">
            <p>
              We believe the future of mental healthcare should be shaped by the professionals
              delivering it.
            </p>
            <p>
              That is why we are working closely with therapists throughout the development of
              Veyro.
            </p>
            <p>
              Our growing Founding Therapist Network is helping us understand the challenges
              practitioners face every day, from finding suitable clients and managing their
              practice to navigating the complexities of running an independent business.
            </p>
            <p>Their feedback continues to shape the platform we are building.</p>
          </Section>

          <Section title="Our approach">
            <p>At Veyro, we believe technology should support human connection, not replace it.</p>
            <p>
              We are focused on creating tools that help people find the right support while
              respecting the importance of the therapeutic relationship.
            </p>
            <p>Everything we build is guided by four principles:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>
                <strong>Trust</strong> — Mental healthcare requires confidence, professionalism, and
                accountability.
              </li>
              <li>
                <strong>Human</strong> — People are more than search filters and checkboxes.
              </li>
              <li>
                <strong>Accessibility</strong> — Quality mental healthcare should be easier to find
                and access.
              </li>
              <li>
                <strong>Simplicity</strong> — Technology should reduce complexity, not create it.
              </li>
            </ul>
          </Section>

          <Section title="Meet the Founder">
            <p>
              Veyro was founded by Sam Franks, whose background spans technology, finance, and
              compliance.
            </p>
            <p>
              Having worked in highly regulated industries, Sam recognised many of the challenges
              faced by both clients seeking support and therapists building independent practices.
            </p>
            <p>
              Veyro was created to bring together technology, trust, and human-centred design to
              improve how people access mental healthcare.
            </p>
          </Section>

          <Section title="The future of Veyro">
            <p>We're still at the beginning of our journey.</p>
            <p>
              Today, we're building a network of therapists and refining the platform with their
              support and feedback.
            </p>
            <p>
              Tomorrow, we aim to become a trusted platform that helps people find the right
              therapist with confidence while providing practitioners with the tools they need to
              run successful, sustainable practices.
            </p>
          </Section>

          <Section title="Company Information">
            <p>
              <strong>VEYRO HEALTH LTD</strong>
            </p>
            <p>United Kingdom</p>
            <p>
              Email:{" "}
              <a
                className="text-primary underline-offset-4 hover:underline"
                href="mailto:join@veyrohealth.com"
              >
                join@veyrohealth.com
              </a>
            </p>
            <p>
              Website:{" "}
              <a
                className="text-primary underline-offset-4 hover:underline"
                href="https://www.veyrohealth.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.veyrohealth.com
              </a>
            </p>
          </Section>
        </div>
      </article>
      <Footer />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 pt-6">
      <h2 className="font-serif text-2xl font-semibold text-primary md:text-3xl">{title}</h2>
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">{children}</div>
    </section>
  );
}
