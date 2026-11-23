import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND_SHARE_IMAGE_META } from "@/lib/share-image";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/how-veyro-works")({
  component: HowVeyroWorksPage,
  head: () => ({
    meta: [
      ...BRAND_SHARE_IMAGE_META,
      { title: "How Veyro Works — Veyro" },
      {
        name: "description",
        content:
          "Learn how Veyro helps clients find the right therapist and supports therapists in growing their practice.",
      },
      { property: "og:title", content: "How Veyro Works — Veyro" },
      {
        property: "og:description",
        content:
          "Learn how Veyro helps clients find the right therapist and supports therapists in growing their practice.",
      },
    ],
  }),
});

function HowVeyroWorksPage() {
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
            How it works
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.05] text-primary md:text-6xl">
            How Veyro Works
          </h1>
        </header>

        <div className="prose-veyro mt-10 space-y-6 text-base leading-relaxed text-foreground/80">
          <p>Finding the right therapist shouldn&apos;t feel overwhelming.</p>
          <p>
            Veyro is designed to make finding mental health support more trusted, human, and
            accessible.
          </p>
          <p>
            Our platform helps people connect with qualified therapists online, while giving
            practitioners the tools they need to grow and manage their practice.
          </p>

          <Section title="Step 1: Tell us what you're looking for">
            <p>Every person&apos;s mental health journey is different.</p>
            <p>
              Clients begin by sharing information about the support they are seeking, including
              their goals, preferences, and the challenges they would like help with.
            </p>
            <p>This helps us understand what matters most to them.</p>
          </Section>

          <Section title="Step 2: Discover suitable therapists">
            <p>
              Using the information provided, Veyro helps identify therapists who may be a good fit.
            </p>
            <p>We consider a range of factors including:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Areas of expertise</li>
              <li>Professional background</li>
              <li>Therapeutic approach</li>
              <li>Availability</li>
              <li>Client preferences</li>
            </ul>
            <p>
              Our goal is not simply to present hundreds of profiles, but to help people make more
              confident and informed decisions.
            </p>
          </Section>

          <Section title="Step 3: Connect directly">
            <p>
              Once a client finds a therapist they feel comfortable with, they can connect directly
              through the platform.
            </p>
            <p>
              Many therapists choose to offer a free introductory consultation, giving clients the
              opportunity to ask questions and determine whether the therapist feels like the right
              fit.
            </p>
          </Section>

          <Section title="Step 4: Begin therapy">
            <p>Therapy takes place online, allowing clients to access support from anywhere.</p>
            <p>
              Therapists remain fully independent and maintain control over how they work, including
              their availability, fees, and therapeutic approach.
            </p>
          </Section>

          <Section title="For Therapists">
            <p>Veyro is more than a directory.</p>
            <p>
              We&apos;re building a platform designed to support therapists throughout their private
              practice journey.
            </p>
            <p>Features include:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Professional therapist profiles</li>
              <li>Client matching and referrals</li>
              <li>Secure session notes</li>
              <li>Availability management</li>
              <li>Pricing controls</li>
              <li>Testimonials and profile management</li>
              <li>Practice management tools</li>
            </ul>
            <p>
              Our aim is to reduce administrative burden and help therapists focus on what matters
              most: supporting their clients.
            </p>
          </Section>

          <Section title="Built on Trust">
            <p>Every therapist profile is reviewed before being made visible on the platform.</p>
            <p>
              We are committed to creating a trusted environment for both therapists and clients,
              built around professionalism, transparency, and quality care.
            </p>
          </Section>

          <Section title="Join the Founding Therapist Network">
            <p>
              We&apos;re currently inviting therapists to join our Founding Therapist Network and
              help shape the future of Veyro.
            </p>
            <p>There is no cost to join, no subscription fee, and no obligation.</p>
            <p>
              Become part of the original practitioner community helping build a more trusted and
              accessible future for mental healthcare.
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
