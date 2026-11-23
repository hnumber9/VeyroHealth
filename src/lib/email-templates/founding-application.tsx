import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailLogo } from "./logo";

const SITE_NAME = "Veyro";

interface FoundingApplicationProps {
  fullName?: string;
  email?: string;
  practice?: string;
  location?: string;
  website?: string;
  submittedAt?: string;
}

const FoundingApplicationEmail = ({
  fullName,
  email,
  practice,
  location,
  website,
  submittedAt,
}: FoundingApplicationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Founding Therapist application from {fullName || "a therapist"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Heading style={h1}>New Founding Therapist Application</Heading>
        <Text style={text}>A new application has been submitted via the {SITE_NAME} website.</Text>

        <Section style={card}>
          <Row label="Full Name" value={fullName} />
          <Row label="Email" value={email} />
          <Row label="Practice Type" value={practice} />
          <Row label="Location" value={location} />
          <Row label="Website" value={website || "—"} />
          {submittedAt ? <Row label="Submitted" value={submittedAt} /> : null}
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Reply directly to this email to reach the applicant at {email || "the address above"}.
        </Text>
      </Container>
    </Body>
  </Html>
);

const Row = ({ label, value }: { label: string; value?: string }) => (
  <Section style={row}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={rowValue}>{value || "—"}</Text>
  </Section>
);

export const template = {
  component: FoundingApplicationEmail,
  subject: (data: Record<string, any>) =>
    `New Veyro Founding Therapist application — ${data?.fullName || "New applicant"}`,
  displayName: "Founding Therapist application",
  to: "join@veyrohealth.com",
  previewData: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    practice: "Individual therapy",
    location: "London, UK",
    website: "janedoe-therapy.com",
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 16px" };
const text = { fontSize: "14px", color: "#55575d", lineHeight: "1.5", margin: "0 0 20px" };
const card = { border: "1px solid #e5e5e5", borderRadius: "8px", padding: "8px 16px" };
const row = { padding: "10px 0", borderBottom: "1px solid #f0f0f0" };
const rowLabel = {
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "#888",
  margin: "0 0 4px",
};
const rowValue = { fontSize: "14px", color: "#1a1a1a", margin: 0 };
const hr = { borderColor: "#eaeaea", margin: "24px 0" };
const footer = { fontSize: "12px", color: "#999", margin: 0 };
