import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND_SHARE_IMAGE_META } from "@/lib/share-image";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      ...BRAND_SHARE_IMAGE_META,
      { title: "Privacy Policy — Veyro" },
      {
        name: "description",
        content:
          "How Veyro Health Ltd collects, uses, and protects your personal information under UK GDPR.",
      },
      { property: "og:title", content: "Privacy Policy — Veyro" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content:
          "How Veyro Health Ltd collects, uses, and protects your personal information under UK GDPR.",
      },
    ],
  }),
});

function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: 26 October 2026</p>
        </header>

        <div className="prose-veyro mt-10 space-y-6 text-base leading-relaxed text-foreground/80">
          <p>Welcome to Veyro Health Ltd (“Veyro”, “we”, “our”, or “us”).</p>
          <p>
            We are committed to protecting your privacy and handling your personal information
            transparently and securely.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, and protect your information when you
            visit our website, join our mailing list, submit information through our forms, or
            engage with our services.
          </p>

          <Section title="1. Who We Are">
            <p>
              Veyro Health Ltd is a UK-based company building a platform to help people connect with
              trusted mental health professionals and therapists.
            </p>
            <p>
              If you have any questions about this Privacy Policy or your data, you can contact us
              at:
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a
                className="text-primary underline-offset-4 hover:underline"
                href="mailto:support@veyrohealth.com"
              >
                support@veyrohealth.com
              </a>
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>
              We may collect the following information when you use our website or submit a form:
            </p>
            <ul>
              <li>Full name</li>
              <li>Email address</li>
              <li>Location</li>
              <li>Professional information (such as practice type or website)</li>
              <li>Any information voluntarily submitted through forms or contact requests</li>
              <li>
                Technical data such as IP address, browser type, device information, and website
                usage analytics
              </li>
            </ul>
            <p>
              We only collect information that is relevant to providing and improving our services.
            </p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We may use your information to:</p>
            <ul>
              <li>Respond to enquiries</li>
              <li>Manage therapist applications and onboarding</li>
              <li>Provide updates about Veyro and our services</li>
              <li>Improve our website and platform experience</li>
              <li>Monitor and analyse website usage</li>
              <li>Communicate with users about future launches, features, and opportunities</li>
              <li>Comply with legal or regulatory obligations</li>
            </ul>
            <p>We do not sell your personal information.</p>
          </Section>

          <Section title="4. Legal Basis for Processing">
            <p>Under UK GDPR, we rely on one or more of the following legal bases:</p>
            <ul>
              <li>Consent</li>
              <li>Legitimate interests</li>
              <li>Performance of a contract</li>
              <li>Compliance with legal obligations</li>
            </ul>
            <p>Where we rely on consent, you may withdraw your consent at any time.</p>
          </Section>

          <Section title="5. Marketing Communications">
            <p>Submitting a therapist matching request does not sign you up to marketing emails.</p>
            <p>
              If you choose to join our mailing list or submit your information through our forms,
              we may send you updates about Veyro, therapist onboarding opportunities, platform
              developments, and related communications.
            </p>
            <p>
              You can unsubscribe from marketing communications at any time using the unsubscribe
              link in our emails or by contacting us directly.
            </p>
          </Section>

          <Section title="6. Data Sharing">
            <p>
              We may share information with trusted third-party providers who help us operate our
              website and services, including:
            </p>
            <ul>
              <li>Website hosting providers</li>
              <li>Email and communication platforms</li>
              <li>Analytics providers</li>
              <li>CRM and onboarding systems</li>
            </ul>
            <p>
              These providers are required to handle your information securely and in accordance
              with applicable data protection laws.
            </p>
            <p>We do not sell or rent personal information to third parties.</p>
          </Section>

          <Section title="Therapist Matching Requests">
            <p>
              When you ask us to help find a therapist, we collect your email address, the support
              you are looking for and your preferences for a therapist’s gender and age range. Your
              request may contain sensitive information about your mental health.
            </p>
            <p>
              We use this information only with your explicit consent to review your request,
              suggest therapists and contact you by email. Your request and the consent wording and
              time are saved securely and sent to the Veyro team’s matching inbox. Access is
              restricted to people handling your request and the service providers needed to store
              and deliver it.
            </p>
            <p>
              Please share only what is needed for matching, rather than detailed medical records or
              information about other people. This form is not monitored as an emergency or crisis
              service.
            </p>
            <p>
              You can withdraw your consent or request deletion by contacting
              support@veyrohealth.com. Matching requests are retained only for as long as reasonably
              necessary to handle your enquiry, subject to any applicable legal obligations.
            </p>
          </Section>

          <Section title="7. Data Storage and Security">
            <p>
              We take reasonable technical and organisational measures to protect your information
              from unauthorised access, loss, misuse, or disclosure.
            </p>
            <p>However, no online platform can guarantee absolute security.</p>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We retain personal information only for as long as reasonably necessary for the
              purposes outlined in this Privacy Policy, including legal, regulatory, or operational
              requirements.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p>Under UK GDPR, you may have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Restrict or object to processing</li>
              <li>Withdraw consent</li>
              <li>Request transfer of your data</li>
              <li>Lodge a complaint with the Information Commissioner’s Office (ICO)</li>
            </ul>
            <p>
              To exercise any of these rights, please contact{" "}
              <a
                className="text-primary underline-offset-4 hover:underline"
                href="mailto:support@veyrohealth.com"
              >
                support@veyrohealth.com
              </a>
              .
            </p>
          </Section>

          <Section title="10. Cookies and Analytics">
            <p>
              We may use cookies and similar technologies to improve website functionality, analyse
              traffic, and understand user behaviour.
            </p>
            <p>You can control cookie settings through your browser preferences.</p>
          </Section>

          <Section title="11. Third-Party Links">
            <p>
              Our website may contain links to third-party websites or services. We are not
              responsible for the privacy practices or content of those third parties.
            </p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Any updates will be posted on
              this page with the revised effective date.
            </p>
          </Section>

          <Section title="13. Contact Us">
            <p>If you have any questions about this Privacy Policy or your data, please contact:</p>
            <p className="font-serif text-xl text-primary">Veyro Health Ltd</p>
            <p>
              Email:{" "}
              <a
                className="text-primary underline-offset-4 hover:underline"
                href="mailto:support@veyrohealth.com"
              >
                support@veyrohealth.com
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
