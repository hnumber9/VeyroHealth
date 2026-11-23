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

interface Props {
  fullName?: string;
  availabilityUrl?: string;
}

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <Section style={step}>
    <Text style={stepTitle}>
      {n}. {title}
    </Text>
    <Text style={stepBody}>{children}</Text>
  </Section>
);

const Email = ({ fullName, availabilityUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're approved — add your availability to go live</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Heading style={h1}>You're approved, {fullName || "there"} 🎉</Heading>
        <Section>
          <Text style={text}>
            Great news — the Veyro clinical team has approved your profile. There's one last step
            before it goes live: connect your calendar and add your sessions and prices so clients
            can book with you.
          </Text>
          <Hr style={hr} />
          <Heading as="h2" style={h2}>
            Setting up your calendar — 4 steps
          </Heading>

          <Step n={1} title="Click Continue with Cal.com on Veyro">
            Open <strong>Meeting settings</strong> on your dashboard and click{" "}
            <strong>Continue with Cal.com</strong>. It takes you straight to{" "}
            <Link href="https://app.cal.com/signup" style={link}>
              Cal.com
            </Link>{" "}
            to sign up (or sign in) and approve access. If you're signing up, work through Cal.com's
            onboarding: when it asks which plan you want, choose <strong>Personal use</strong>{" "}
            (free), add your details, then either connect your calendar or choose{" "}
            <strong>skip for now</strong> — you can link calendars later. At the end, Cal.com asks
            for permission to connect to <strong>Veyro</strong> — click <strong>Allow</strong> /{" "}
            <strong>Approve</strong> so we can see your session types and availability.
          </Step>
          <Step n={2} title="Set up your links — one per session you offer">
            Cal.com calls these links your <strong>Event Types</strong> — each one is a session type
            clients can book. Open <strong>Event Types</strong> → <strong>New</strong>, and create
            one for each session length — for example “50-minute therapy session” and “15-minute
            intro call”. Set the duration only — leave Cal.com payments switched off, you'll price
            them on Veyro.
          </Step>
          <Step n={3} title="Set your working hours">
            In Cal.com, open <strong>Availability</strong> and set the days and times you're happy
            to see clients, and check your timezone is correct. You can also link your other
            calendars so you never get double-booked.
          </Step>
          <Step n={4} title="Return to Veyro and set your prices">
            Come back to the <strong>Meeting settings</strong> tab and refresh — your meeting types
            appear ready to price. Add a price for each one and save. Clients pay securely when they
            book, and the session is held in your calendar.
          </Step>

          {availabilityUrl ? (
            <Section style={{ textAlign: "center", margin: "26px 0" }}>
              <Button href={availabilityUrl} style={button}>
                Open Meeting settings
              </Button>
            </Section>
          ) : null}
          <Text style={text}>
            As soon as your calendar is connected and your prices are set, your profile appears in
            the Veyro therapist directory and starts accepting bookings.
          </Text>
          <Text style={text}>
            Stuck on any step? Just reply to this email and we'll walk you through it.
          </Text>
          {availabilityUrl ? (
            <Text style={{ ...text, wordBreak: "break-all" as const, color: "#55575d" }}>
              Or paste this link into your browser: {availabilityUrl}
            </Text>
          ) : null}
          <Text style={signoff}>— The Veyro team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "You're approved — add your availability to go live on Veyro",
  displayName: "Therapist approved",
  previewData: {
    fullName: "Eva",
    availabilityUrl: "https://www.veyrohealth.com/therapist/dashboard?tab=availability",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 16px" };
const h2 = {
  fontSize: "13px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#55575d",
  margin: "0 0 12px",
};
const text = { fontSize: "14px", color: "#1a1a1a", lineHeight: "1.55", margin: "0 0 14px" };
const hr = { borderColor: "#e5e5e5", margin: "22px 0 18px" };
const step = {
  borderLeft: "3px solid #1a1a1a",
  paddingLeft: "14px",
  margin: "0 0 16px",
};
const stepTitle = { fontSize: "14px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 4px" };
const stepBody = { fontSize: "14px", color: "#3d3f45", lineHeight: "1.55", margin: 0 };
const link = { color: "#1a1a1a", textDecoration: "underline" };
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
