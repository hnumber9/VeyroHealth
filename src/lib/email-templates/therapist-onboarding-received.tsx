import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailLogo } from "./logo";

interface Props {
  fullName?: string;
}

const Email = ({ fullName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We've received your Veyro profile — thank you</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Heading style={h1}>Thanks, {fullName || "there"} — your profile is with us</Heading>
        <Section>
          <Text style={text}>
            We've received your therapist profile submission and it's now with the Veyro clinical
            team for review.
          </Text>
          <Text style={text}>
            We'll email you as soon as your profile is approved and live on Veyro. If we need any
            extra information, we'll reach out directly.
          </Text>
          <Text style={signoff}>— The Veyro team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "We\u2019ve received your Veyro therapist profile",
  displayName: "Therapist onboarding — received",
  previewData: { fullName: "Eva" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 16px" };
const text = { fontSize: "14px", color: "#1a1a1a", lineHeight: "1.55", margin: "0 0 14px" };
const signoff = { fontSize: "14px", color: "#55575d", margin: "24px 0 0" };
