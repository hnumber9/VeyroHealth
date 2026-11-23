import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND_SHARE_IMAGE_META } from "@/lib/share-image";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/faqs")({
  component: FAQsPage,
  head: () => ({
    meta: [
      ...BRAND_SHARE_IMAGE_META,
      { title: "Frequently Asked Questions — Veyro" },
      {
        name: "description",
        content:
          "Find answers to frequently asked questions about Veyro, our therapist network, and how the platform works.",
      },
      { property: "og:title", content: "Frequently Asked Questions — Veyro" },
      {
        property: "og:description",
        content:
          "Find answers to frequently asked questions about Veyro, our therapist network, and how the platform works.",
      },
    ],
  }),
});

function FAQsPage() {
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
            Help
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.05] text-primary md:text-6xl">
            Frequently Asked Questions
          </h1>
        </header>

        <div className="prose-veyro mt-10 space-y-6 text-base leading-relaxed text-foreground/80">
          <Section title="What is Veyro?">
            <p>
              Veyro is an online mental health platform designed to help people find the right
              therapist with confidence. We are building a trusted, human-centred experience that
              makes it easier for clients to connect with qualified mental health professionals
              while helping therapists grow and manage their practice.
            </p>
          </Section>

          <Section title="Is Veyro a therapy provider?">
            <p>
              No. Veyro is not a therapy provider, counselling agency, or EAP service. We provide a
              platform that helps clients discover and connect with therapists. The therapeutic
              relationship remains directly between the client and therapist.
            </p>
          </Section>

          <Section title="Is Veyro online only?">
            <p>
              Yes. Veyro is an online-first platform designed to connect clients and therapists
              regardless of location. Our focus is on making therapy more accessible and removing
              geographical barriers to support.
            </p>
          </Section>

          <Section title="Who owns Veyro?">
            <p>Veyro is operated by VEYRO HEALTH LTD, a UK registered company.</p>
          </Section>

          <Section title="Who founded Veyro?">
            <p>
              Veyro was founded by Sam Franks, whose background spans technology, finance, and
              compliance. Veyro is being developed alongside therapists and mental health
              professionals to ensure the platform meets the needs of both practitioners and
              clients.
            </p>
          </Section>

          <Section title="For Therapists">
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Is it free to join?
                </h3>
                <p className="mt-2">
                  Yes. There is currently no cost to join Veyro, and therapists can create a profile
                  free of charge.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Will there be subscription fees?
                </h3>
                <p className="mt-2">
                  We do not currently plan to charge therapists a subscription fee simply to have a
                  profile on the platform.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  How does Veyro make money?
                </h3>
                <p className="mt-2">
                  Our long-term business model is based primarily on a small commission when a
                  client is successfully introduced through the platform. This means therapists only
                  contribute when they receive genuine value from Veyro. We may also introduce
                  optional premium features and services in the future.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Do therapists set their own fees?
                </h3>
                <p className="mt-2">
                  Yes. Therapists retain full control over their own pricing, availability, and
                  practice arrangements.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Can I continue working with clients outside of Veyro?
                </h3>
                <p className="mt-2">
                  Yes. Veyro is designed to support therapists, not restrict them. Therapists remain
                  independent practitioners and continue to manage their own practice.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  What is a Founding Therapist?
                </h3>
                <p className="mt-2">
                  Founding Therapists are practitioners who join Veyro before launch. Founding
                  Therapists will receive Founding Therapist status and recognition as part of the
                  original therapist network helping shape the future of Veyro.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  How are therapists verified?
                </h3>
                <p className="mt-2">
                  Trust and safety are extremely important to us. We review practitioner profiles
                  and intend to verify relevant professional qualifications, memberships,
                  accreditations, and other information before therapists are made visible to
                  clients.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Which professional memberships do you accept?
                </h3>
                <p className="mt-2">
                  We welcome applications from appropriately qualified mental health professionals
                  and are continuously reviewing the professional bodies and accreditations
                  supported by the platform.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Matching & Referrals">
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  How does matching work?
                </h3>
                <p className="mt-2">
                  We&apos;re building a human-first approach to matching that considers a range of
                  factors including client needs, therapist specialisms, preferences, and
                  suitability. Our goal is to help clients make confident decisions rather than
                  simply presenting them with hundreds of profiles.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  What makes Veyro different from other directories?
                </h3>
                <p className="mt-2">
                  Many directories focus on listing therapists. Our aim is to create a more
                  thoughtful experience that helps clients find the right therapist while providing
                  therapists with tools to manage and grow their practice. Over time, Veyro will
                  combine therapist discovery, practice management, client communication, session
                  notes, scheduling, and other tools within a single platform.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Can you guarantee referrals?
                </h3>
                <p className="mt-2">
                  No. As with any platform, referral volumes will depend on a variety of factors
                  including client demand, therapist profiles, availability, specialisms, and market
                  conditions. We prefer to be transparent and avoid making promises we cannot
                  support.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  How will clients find me?
                </h3>
                <p className="mt-2">
                  Clients will be able to discover therapists through the Veyro platform and
                  matching experience. Our goal is to connect clients with therapists who may be a
                  suitable fit for their needs and preferences.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Privacy & Security">
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Is Veyro GDPR compliant?
                </h3>
                <p className="mt-2">
                  Protecting personal data is a core priority for us. We are committed to operating
                  in accordance with applicable UK data protection laws and GDPR requirements.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Are session notes secure?
                </h3>
                <p className="mt-2">
                  Yes. We are building secure systems designed to protect therapist and client
                  information and support the safe management of session records.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Will my profile be reviewed before going live?
                </h3>
                <p className="mt-2">
                  Yes. All therapist profiles are reviewed before being made visible to clients.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Getting Started">
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">How do I join?</h3>
                <p className="mt-2">
                  Simply create an account and complete your therapist profile. Once submitted, your
                  profile will be reviewed by our team before being approved.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  What happens after I submit my profile?
                </h3>
                <p className="mt-2">Once submitted:</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-6">
                  <li>Your profile enters review</li>
                  <li>Verification checks are completed where required</li>
                  <li>We assess profile quality and completeness</li>
                  <li>Approved therapists become visible on the platform when appropriate</li>
                </ul>
                <p className="mt-2">We will keep you updated throughout the process.</p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  Can I update my profile later?
                </h3>
                <p className="mt-2">
                  Yes. You will be able to update your profile, availability, pricing, and other
                  information through your practitioner dashboard.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Still have a question?">
            <p>
              We&apos;d love to hear from you. Please contact us at:{" "}
              <a
                className="text-primary underline-offset-4 hover:underline"
                href="mailto:join@veyrohealth.com"
              >
                join@veyrohealth.com
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
