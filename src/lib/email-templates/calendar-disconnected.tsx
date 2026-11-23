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
  forAdmin?: boolean;
  therapistEmail?: string;
}

const Email = ({ therapistName, forAdmin, therapistEmail }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {forAdmin
        ? `${therapistName || "A therapist"}'s calendar needs reconnecting`
        : "Your Cal.com calendar needs reconnecting"}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        {forAdmin ? (
          <>
            <Heading style={h1}>
              {therapistName || "A therapist"}'s calendar has disconnected
            </Heading>
            <Section>
              <Text style={text}>
                The Cal.com link for {therapistName || "this therapist"}
                {therapistEmail ? ` (${therapistEmail})` : ""} has expired. Clients can't book them
                on Veyro until they reconnect.
              </Text>
              <Text style={text}>We've emailed the therapist asking them to reconnect.</Text>
            </Section>
          </>
        ) : (
          <>
            <Heading style={h1}>Your calendar needs reconnecting</Heading>
            <Section>
              <Text style={text}>
                Hi {therapistName || "there"}, the link between Veyro and your Cal.com account has
                expired, so clients can't book you on Veyro right now.
              </Text>
              <Text style={text}>
                To fix it, sign in to your Veyro dashboard, open Meeting settings and press
                "Reconnect Cal.com". It only takes a minute.
              </Text>
              <Button href="https://www.veyrohealth.com/therapist/signin" style={button}>
                Go to my dashboard
              </Button>
            </Section>
          </>
        )}
        <Text style={signoff}>— The Veyro team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d.forAdmin
      ? `Calendar disconnected: ${d.therapistName || "therapist"}`
      : "Action needed: reconnect your Cal.com calendar",
  displayName: "Calendar disconnected",
  previewData: { therapistName: "Sophie Veyro" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 16px" };
const text = { fontSize: "14px", color: "#1a1a1a", lineHeight: "1.55", margin: "0 0 14px" };
const button = {
  backgroundColor: "#1a1a1a",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  textDecoration: "none",
};
const signoff = { fontSize: "14px", color: "#55575d", margin: "24px 0 0" };
