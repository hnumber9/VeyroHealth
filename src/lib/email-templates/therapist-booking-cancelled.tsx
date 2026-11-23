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

interface Props {
  therapistName?: string;
  clientName?: string | null;
  clientEmail?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  sessionType?: string | null;
  cancellationReason?: string | null;
}

const Detail = ({ label, value }: { label: string; value?: string | null }) => (
  <Section style={row}>
    <Text style={labelStyle}>{label}</Text>
    <Text style={valueStyle}>{value || "—"}</Text>
  </Section>
);

const TherapistBookingCancelled = ({
  therapistName,
  clientName,
  clientEmail,
  appointmentDate,
  appointmentTime,
  sessionType,
  cancellationReason,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A session has been cancelled on Veyro Health.</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={eyebrow}>Veyro Health</Text>
        <Heading style={h1}>An appointment has been cancelled</Heading>
        <Text style={text}>
          Hi {therapistName || "there"}, the session below is no longer scheduled and the slot is
          free again.
        </Text>
        <Heading as="h2" style={h2}>
          Cancelled appointment
        </Heading>
        <Section style={card}>
          <Detail label="Client" value={clientName || clientEmail} />
          <Detail label="Client email" value={clientEmail} />
          <Detail label="Date" value={appointmentDate} />
          <Detail label="Time" value={appointmentTime} />
          <Detail label="Session type" value={sessionType} />
          {cancellationReason ? <Detail label="Reason" value={cancellationReason} /> : null}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Veyro Health · This session has been removed from Upcoming sessions.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: TherapistBookingCancelled,
  subject: "A Veyro Health appointment has been cancelled",
  displayName: "Booking cancelled (therapist)",
  previewData: {
    therapistName: "Dr Jane Smith",
    clientName: "Alex",
    clientEmail: "alex@example.com",
    appointmentDate: "Monday, 14 July 2026",
    appointmentTime: "10:00 – 10:50",
    sessionType: "50-minute therapy session",
    cancellationReason: "Client cancelled",
  },
} satisfies TemplateEntry;

// --- styles ---
const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
  color: "#0f172a",
  padding: "24px 0",
};
const container: React.CSSProperties = { maxWidth: "560px", margin: "0 auto", padding: "0 24px" };
const eyebrow: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "12px",
  color: "#64748b",
  margin: "0 0 8px",
};
const h1: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "28px",
  lineHeight: "1.2",
  margin: "0 0 16px",
  color: "#0f172a",
};
const h2: React.CSSProperties = {
  fontSize: "15px",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#334155",
  margin: "28px 0 12px",
};
const text: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#0f172a",
  margin: "0 0 12px",
};
const card: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "4px 16px",
  backgroundColor: "#f8fafc",
};
const row: React.CSSProperties = { borderBottom: "1px solid #e2e8f0", padding: "10px 0" };
const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#64748b",
  margin: "0 0 2px",
};
const valueStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#0f172a",
  margin: 0,
  wordBreak: "break-word",
};
const hr: React.CSSProperties = { borderColor: "#e2e8f0", margin: "28px 0 16px" };
const footer: React.CSSProperties = { fontSize: "12px", color: "#64748b", margin: 0 };
