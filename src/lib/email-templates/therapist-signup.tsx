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

interface TherapistSignupProps {
  fullName?: string;
  email?: string;
  signedUpAt?: string;
}

const TherapistSignupEmail = ({ fullName, email, signedUpAt }: TherapistSignupProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New therapist account created — {fullName || "New therapist"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Heading style={h1}>New Therapist Account Created</Heading>
        <Text style={text}>A new therapist account has been created on {SITE_NAME}.</Text>

        <Section style={card}>
          <Row label="Full Name" value={fullName} />
          <Row label="Email" value={email} />
          {signedUpAt ? <Row label="Signed Up" value={signedUpAt} /> : null}
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Reply directly to this email to reach the therapist at {email || "the address above"}.
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
  component: TherapistSignupEmail,
  subject: (data: Record<string, any>) =>
    `New Veyro therapist account — ${data?.fullName || "New signup"}`,
  displayName: "Therapist account created",
  previewData: {
    fullName: "Dr. Eva Kowalski",
    email: "eva@example.com",
    signedUpAt: new Date().toISOString(),
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
