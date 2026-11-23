import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import { EmailLogo } from "./logo";
import type { TemplateEntry } from "./registry";

interface Props {
  kind?: "booking" | "refund";
  therapistName?: string;
  clientName?: string;
  clientEmail?: string;
  serviceName?: string;
  slotStart?: string;
  amount?: string;
  reason?: string;
  detail?: string;
  intentId?: string;
}

function formatUkTime(iso?: string) {
  if (!iso) return "Unknown time";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "full",
    timeStyle: "short",
  });
}

function BookingNeedsReview(p: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`A booking with ${p.therapistName ?? "a therapist"} needs attention`}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ padding: "24px", maxWidth: "560px" }}>
          <EmailLogo />
          {p.kind === "refund" ? (
            <>
              <Heading>A refund didn't go through</Heading>
              <Text>
                The session was cancelled, but the patient's money wasn't refunded automatically.
              </Text>
            </>
          ) : (
            <>
              <Heading>A booking couldn't be confirmed</Heading>
              <Text>
                The patient finished checkout, but the appointment couldn't be added to the
                therapist's calendar. The patient has not been sent a confirmation.
              </Text>
            </>
          )}
          <Text>Therapist: {p.therapistName}</Text>
          <Text>
            Patient: {p.clientName ? `${p.clientName} (${p.clientEmail})` : p.clientEmail}
          </Text>
          <Text>Session: {p.serviceName ?? "Session"}</Text>
          <Text>Requested time: {formatUkTime(p.slotStart)} (UK time)</Text>
          <Text>Amount: {p.amount}</Text>
          <Text>Why: {p.reason}</Text>
          {p.detail ? (
            <Text style={{ color: "#666666", fontSize: "12px" }}>Details: {p.detail}</Text>
          ) : null}
          <Text>
            {p.kind === "refund"
              ? "Please refund the patient in Stripe."
              : "Please contact the patient and therapist to arrange the session, or refund the patient in Stripe."}
          </Text>
          <Text>Reference: {p.intentId}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: BookingNeedsReview,
  subject: (d: Record<string, any>) =>
    d.kind === "refund"
      ? `Refund failed — ${d.therapistName ?? "Veyro"}`
      : `Booking needs attention — ${d.therapistName ?? "Veyro"}`,
  displayName: "Booking needs attention (admin)",
  previewData: {
    therapistName: "Ana Moore",
    clientEmail: "patient@example.com",
    serviceName: "Therapy Session",
    slotStart: "2026-10-09T15:00:00Z",
    amount: "65.00 GBP",
    reason: "Cal.com refused the booking.",
    intentId: "00000000-0000-0000-0000-000000000000",
  },
} satisfies TemplateEntry;
