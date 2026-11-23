import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailLogo } from "./logo";

interface OnboardingCompleteProps {
  fullName?: string;
  email?: string;
  completedAt?: string;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  yearsInPractice?: string | null;
  qualifications?: string | null;
  specialties?: string[];
  languages?: string[];
  insuranceProviders?: string[];
  calendlyUrl?: string | null;
  sessionFee?: string | null;
  offersIntroCall?: boolean;
  slug?: string | null;
  reviewUrl?: string | null;
}

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <Section style={row}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={rowValue}>{value && value.length ? value : "—"}</Text>
  </Section>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <Heading as="h2" style={h2}>
    {children}
  </Heading>
);

const OnboardingCompleteEmail = (props: OnboardingCompleteProps) => {
  const {
    fullName,
    email,
    completedAt,
    title,
    headline,
    bio,
    photoUrl,
    yearsInPractice,
    qualifications,
    specialties,
    languages,
    insuranceProviders,
    calendlyUrl,
    sessionFee,
    offersIntroCall,
    slug,
    reviewUrl,
  } = props;
  const list = (arr?: string[]) => (arr && arr.length ? arr.join(", ") : "—");
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New therapist sign-up — {fullName || "New therapist"}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailLogo />
          <Heading style={h1}>New therapist sign-up</Heading>
          <Text style={text}>
            {fullName || "A therapist"} has just signed up on Veyro and is awaiting review. Here's a
            preview of their submission — approve or reject them in the admin portal.
          </Text>

          {reviewUrl ? (
            <Section style={{ textAlign: "center", margin: "8px 0 24px" }}>
              <Button href={reviewUrl} style={approveBtn}>
                Review in admin portal
              </Button>
              <Text style={approveHint}>
                Opens this therapist in the Veyro admin portal, where you can approve or reject
                them.
              </Text>
              <Text style={approveFallback}>
                If your mail app hides the button, open this link:
              </Text>
              <Link href={reviewUrl} style={approveLink}>
                {reviewUrl}
              </Link>
            </Section>
          ) : null}

          <SectionHeading>Personal Information</SectionHeading>
          <Section style={card}>
            <Row label="Full Name" value={fullName} />
            <Row label="Email" value={email} />
            <Row label="Professional Title" value={title} />
            <Row label="Profile Slug" value={slug} />
            <Row label="Photo URL" value={photoUrl} />
            <Row label="Completed At" value={completedAt} />
          </Section>

          <SectionHeading>Qualifications</SectionHeading>
          <Section style={card}>
            <Row label="Years in Practice" value={yearsInPractice} />
            <Row label="Qualifications & Certifications" value={qualifications} />
          </Section>

          <SectionHeading>Areas of Expertise & Languages</SectionHeading>
          <Section style={card}>
            <Row label="Areas of Expertise" value={list(specialties)} />
            <Row label="Languages" value={list(languages)} />
          </Section>

          <SectionHeading>Insurance Providers</SectionHeading>
          <Section style={card}>
            <Row label="Accepted Insurers" value={list(insuranceProviders)} />
          </Section>

          <SectionHeading>Availability & Pricing</SectionHeading>
          <Section style={card}>
            <Row label="Calendly Link" value={calendlyUrl} />
            <Row label="Standard Session Fee (GBP)" value={sessionFee} />
            <Row label="Free 15-min Intro Call" value={offersIntroCall ? "Yes" : "No"} />
          </Section>

          <SectionHeading>Headline</SectionHeading>
          <Section style={card}>
            <Text style={paragraph}>{headline && headline.length ? headline : "—"}</Text>
          </Section>

          <SectionHeading>Bio</SectionHeading>
          <Section style={card}>
            <Text style={paragraph}>{bio && bio.length ? bio : "—"}</Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Reply directly to this email to reach the therapist at {email || "the address above"}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: OnboardingCompleteEmail,
  subject: (data: Record<string, any>) =>
    `New therapist sign-up — ${data?.fullName || "New therapist"}`,
  displayName: "New therapist sign-up",
  previewData: {
    fullName: "Dr. Eva Kowalski",
    email: "eva@example.com",
    completedAt: new Date().toISOString(),
    title: "Adult Psychotherapist",
    headline: "Compassionate, trauma-informed therapy for adults.",
    bio: "I work with adults navigating change, anxiety and trauma…",
    photoUrl: "https://example.com/photo.jpg",
    yearsInPractice: "17",
    qualifications: "UKCP, MBACP",
    specialties: ["Anxiety", "Trauma & PTSD"],
    languages: ["English", "Polish"],
    insuranceProviders: ["AXA Health", "Bupa"],
    calendlyUrl: "https://calendly.com/eva",
    sessionFee: "85",
    offersIntroCall: true,
    slug: "eva-kowalski",
    reviewUrl: "https://www.veyrohealth.com/admin?review=00000000-0000-0000-0000-000000000000",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "20px", width: "100%", maxWidth: "600px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 16px" };
const h2 = {
  fontSize: "13px",
  fontWeight: "bold",
  color: "#1a1a1a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "28px 0 8px",
};
const text = { fontSize: "14px", color: "#55575d", lineHeight: "1.5", margin: "0 0 20px" };
const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.55",
  margin: "6px 0",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
};
const card = {
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "4px 16px",
  width: "100%",
};
const row = { padding: "10px 0", borderBottom: "1px solid #f0f0f0", width: "100%" };
const rowLabel = {
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "#888",
  margin: "0 0 4px",
};
const rowValue = {
  fontSize: "14px",
  color: "#1a1a1a",
  margin: 0,
  wordBreak: "break-word" as const,
  overflowWrap: "anywhere" as const,
};
const hr = { borderColor: "#eaeaea", margin: "24px 0" };
const footer = { fontSize: "12px", color: "#999", margin: 0 };
const approveBtn = {
  backgroundColor: "#0f7a3d",
  color: "#ffffff",
  padding: "12px 22px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
};
const approveHint = { fontSize: "11px", color: "#888", margin: "8px 0 0", lineHeight: "1.4" };
const approveFallback = {
  fontSize: "11px",
  color: "#888",
  margin: "10px 0 4px",
  lineHeight: "1.4",
};
const approveLink = {
  fontSize: "11px",
  color: "#0f7a3d",
  wordBreak: "break-all" as const,
  lineHeight: "1.4",
};
