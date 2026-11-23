import * as React from "react";
import {
  Body,
  Button,
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
  therapistName?: string;
  signupUrl?: string;
}

const Email = ({ therapistName, signupUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {therapistName ? `${therapistName} invited you to Veyro` : "You have been invited to Veyro"}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Heading style={h1}>
          {therapistName
            ? `${therapistName} invited you to Veyro`
            : "You have been invited to Veyro"}
        </Heading>
        <Section>
          <Text style={text}>
            {therapistName ? `${therapistName} uses ` : "Your therapist uses "}
            Veyro to share session notes, resources and appointment details with clients in one
            calm, private space.
          </Text>
          <Text style={text}>
            Create your free client account with this email address to see anything they've shared
            with you.
          </Text>
          {signupUrl ? (
            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button href={signupUrl} style={button}>
                Create your Veyro account
              </Button>
            </Section>
          ) : null}
          <Text style={muted}>
            If you weren't expecting this, you can safely ignore this email — no account will be
            created until you sign up.
          </Text>
          <Text style={signoff}>— The Veyro team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: ({ therapistName }: Props) =>
    therapistName ? `${therapistName} invited you to Veyro` : "You have been invited to Veyro",
  displayName: "Client invite",
  previewData: {
    therapistName: "Dr. Eva Kowalski",
    signupUrl: "https://www.veyrohealth.com/client/signup",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 16px" };
const text = { fontSize: "14px", color: "#1a1a1a", lineHeight: "1.55", margin: "0 0 14px" };
const muted = { fontSize: "12px", color: "#55575d", lineHeight: "1.55", margin: "18px 0 0" };
const signoff = { fontSize: "14px", color: "#55575d", margin: "24px 0 0" };
const button = {
  backgroundColor: "#1a1a1a",
  color: "#ffffff",
  padding: "12px 22px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
};
