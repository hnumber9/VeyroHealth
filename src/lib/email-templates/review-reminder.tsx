import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { EmailLogo } from "./logo";
import type { TemplateEntry } from "./registry";

function ReviewReminder({
  clientName,
  therapistName,
  reviewUrl,
}: {
  clientName?: string;
  therapistName?: string;
  reviewUrl?: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>How was your session with {therapistName || "your therapist"}?</Preview>
      <Body
        style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", color: "#0f172a" }}
      >
        <Container style={{ maxWidth: "560px", padding: "32px 24px", margin: "0 auto" }}>
          <EmailLogo />
          <Heading style={{ fontFamily: "Georgia, serif", fontSize: "28px" }}>
            How was your session?
          </Heading>
          <Text>{clientName ? `Hi ${clientName},` : "Hi there,"}</Text>
          <Text>
            Following your session with {therapistName || "your therapist"}, you're welcome to share
            a review on Veyro. Your name is not shown publicly.
          </Text>
          {reviewUrl && (
            <Button
              href={reviewUrl}
              style={{
                backgroundColor: "#0f766e",
                color: "#ffffff",
                padding: "14px 22px",
                borderRadius: "6px",
              }}
            >
              Leave a review
            </Button>
          )}
          <Text>
            Sign in using the email you booked with. If you booked as a guest, create a patient
            account with that same email first.
          </Text>
          <Text style={{ fontSize: "12px", color: "#64748b" }}>
            Veyro Health · Questions? Reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: ReviewReminder,
  subject: "How was your Veyro session?",
  displayName: "Post-session review reminder",
  previewData: {
    clientName: "Alex",
    therapistName: "Jane Smith",
    reviewUrl: "https://www.veyrohealth.com/client/dashboard#leave-review",
  },
} satisfies TemplateEntry;
