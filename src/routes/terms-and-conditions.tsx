import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND_SHARE_IMAGE_META } from "@/lib/share-image";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/terms-and-conditions")({
  component: TermsPage,
  head: () => ({
    meta: [
      ...BRAND_SHARE_IMAGE_META,
      { title: "Terms & Conditions — Veyro" },
      {
        name: "description",
        content:
          "The Terms & Conditions governing your use of the Veyro platform and services operated by VEYRO HEALTH LTD.",
      },
      { property: "og:title", content: "Terms & Conditions — Veyro" },
      {
        property: "og:description",
        content:
          "The Terms & Conditions governing your use of the Veyro platform and services operated by VEYRO HEALTH LTD.",
      },
    ],
  }),
});

function TermsPage() {
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
            Legal
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.05] text-primary md:text-6xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">Last Updated: 19/06/2026</p>
        </header>

        <div className="prose-veyro mt-10 space-y-6 text-base leading-relaxed text-foreground/80">
          <p>
            These Terms &amp; Conditions ("Terms") govern your use of the Veyro platform and related
            services operated by VEYRO HEALTH LTD ("Veyro", "we", "us", or "our").
          </p>
          <p>By accessing or using Veyro, you agree to be bound by these Terms.</p>

          <Section title="1. About Veyro">
            <p>
              Veyro is an online platform designed to help individuals discover and connect with
              mental health professionals.
            </p>
            <p>
              Veyro is not a healthcare provider, therapy provider, counselling agency, crisis
              service, or emergency support service.
            </p>
            <p>Therapeutic services are provided independently by therapists and not by Veyro.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>To use Veyro as a therapist, you must:</p>
            <ul>
              <li>Be at least 18 years old.</li>
              <li>
                Hold any qualifications, registrations, memberships, or accreditations required to
                practise lawfully in your jurisdiction.
              </li>
              <li>Provide accurate and complete information during registration.</li>
              <li>Maintain appropriate professional insurance where required.</li>
            </ul>
            <p>
              Veyro reserves the right to request evidence of qualifications, accreditation,
              insurance, identity, or professional standing at any time.
            </p>
          </Section>

          <Section title="3. Therapist Profiles">
            <p>
              Therapists are responsible for ensuring that all information submitted to Veyro is
              accurate, current, and not misleading.
            </p>
            <p>This includes:</p>
            <ul>
              <li>Qualifications</li>
              <li>Experience</li>
              <li>Professional memberships</li>
              <li>Areas of specialism</li>
              <li>Fees</li>
              <li>Availability</li>
              <li>Profile descriptions</li>
            </ul>
            <p>
              Veyro may review, reject, suspend, or remove profiles that do not meet platform
              requirements.
            </p>
          </Section>

          <Section title="4. Verification & Approval">
            <p>Submission of a profile does not guarantee approval.</p>
            <p>All therapist profiles may be reviewed before publication.</p>
            <p>
              Veyro reserves the right to approve, reject, suspend, or remove any profile at its
              sole discretion where necessary to protect users, maintain platform standards, or
              comply with legal obligations.
            </p>
          </Section>

          <Section title="5. Client-Therapist Relationships">
            <p>
              Any therapeutic relationship formed through Veyro exists solely between the client and
              therapist.
            </p>
            <p>
              Veyro is not a party to therapy agreements, treatment decisions, clinical
              recommendations, payments made outside the platform, or professional services provided
              by therapists.
            </p>
            <p>
              Therapists remain fully responsible for their own professional conduct and services.
            </p>
          </Section>

          <Section title="6. Fees & Payments">
            <p>Therapists retain control over their own fees.</p>
            <p>
              Where applicable, Veyro may charge a commission or service fee in connection with
              successful client introductions or other platform services.
            </p>
            <p>Any such fees will be clearly communicated before becoming payable.</p>
            <p>
              Veyro reserves the right to introduce, modify, or discontinue fees and pricing
              structures at any time upon reasonable notice.
            </p>
          </Section>

          <Section title="7. Founding Therapist Status">
            <p>
              Founding Therapist status may be awarded to therapists who join the platform during
              designated pre-launch periods.
            </p>
            <p>
              Founding Therapist status carries no ownership rights, voting rights, equity interest,
              or guarantee of future benefits.
            </p>
            <p>
              Veyro reserves the right to amend or discontinue Founding Therapist programmes at its
              discretion.
            </p>
          </Section>

          <Section title="8. Acceptable Use">
            <p>Users must not:</p>
            <ul>
              <li>Provide false or misleading information.</li>
              <li>Impersonate another person or organisation.</li>
              <li>Use the platform for unlawful purposes.</li>
              <li>Attempt to gain unauthorised access to systems or accounts.</li>
              <li>Interfere with platform operation or security.</li>
              <li>Upload harmful, offensive, fraudulent, or illegal content.</li>
            </ul>
            <p>
              Veyro reserves the right to suspend or terminate accounts that breach these Terms.
            </p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>
              All Veyro branding, software, content, designs, logos, trademarks, and platform
              materials remain the property of VEYRO HEALTH LTD unless otherwise stated.
            </p>
            <p>
              Users may not copy, reproduce, modify, distribute, or commercially exploit Veyro
              content without prior written permission.
            </p>
          </Section>

          <Section title="10. Availability of Services">
            <p>
              We aim to provide reliable access to the platform but do not guarantee uninterrupted
              availability.
            </p>
            <p>
              Features may be modified, updated, suspended, or removed from time to time as part of
              platform development and maintenance.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>To the fullest extent permitted by law, VEYRO HEALTH LTD shall not be liable for:</p>
            <ul>
              <li>Any indirect or consequential losses.</li>
              <li>Loss of income or business opportunities.</li>
              <li>Clinical decisions made by therapists.</li>
              <li>Outcomes arising from therapeutic services.</li>
              <li>Disputes between therapists and clients.</li>
            </ul>
            <p>Nothing in these Terms excludes liability where such exclusion would be unlawful.</p>
          </Section>

          <Section title="12. Data Protection">
            <p>Our collection and use of personal data is governed by our Privacy Policy.</p>
            <p>
              By using Veyro, you acknowledge that your information may be processed in accordance
              with that policy.
            </p>
          </Section>

          <Section title="13. Suspension & Termination">
            <p>
              Veyro may suspend, restrict, or terminate access to the platform at any time where:
            </p>
            <ul>
              <li>These Terms are breached.</li>
              <li>Information provided is inaccurate.</li>
              <li>Continued access poses a risk to users or the platform.</li>
              <li>Required professional standards are not maintained.</li>
            </ul>
            <p>Users may close their account at any time.</p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>We may update these Terms from time to time.</p>
            <p>Where changes are material, we will take reasonable steps to notify users.</p>
            <p>
              Continued use of the platform following updates constitutes acceptance of the revised
              Terms.
            </p>
          </Section>

          <Section title="15. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of England
              and Wales.
            </p>
            <p>
              Any disputes arising from these Terms shall be subject to the exclusive jurisdiction
              of the courts of England and Wales.
            </p>
          </Section>

          <Section title="16. Contact">
            <p className="font-serif text-xl text-primary">VEYRO HEALTH LTD</p>
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
              >
                www.veyrohealth.com
              </a>
            </p>
            <p>For questions regarding these Terms, please contact us using the details above.</p>
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
