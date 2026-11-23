import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import { EmailLogo } from "./logo";
import type { TemplateEntry } from "./registry";

interface Props {
  email?: string;
  helpWith?: string;
  gender?: string;
  age?: string;
  enquiryId?: string;
}
function MatchingEnquiry({ email, helpWith, gender, age, enquiryId }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>A new therapist matching request on Veyro</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ padding: "24px", maxWidth: "560px" }}>
          <EmailLogo />
          <Heading>Therapist matching request</Heading>
          <Text>Email: {email}</Text>
          <Text style={{ whiteSpace: "pre-wrap" }}>Looking for help with: {helpWith}</Text>
          <Text>Preferred therapist gender: {gender ?? "No preference"}</Text>
          <Text>Preferred therapist age: {age ?? "No preference"}</Text>
          <Text>
            The person explicitly agreed to Veyro using this information, including mental-health
            details, to match them and contact them by email.
          </Text>
          <Text>Reply to this email to contact them. Treat these details as confidential.</Text>
          <Text>Reference: {enquiryId}</Text>
        </Container>
      </Body>
    </Html>
  );
}
export const template = {
  component: MatchingEnquiry,
  subject: "New therapist matching request — Veyro",
  displayName: "Therapist matching enquiry",
  to: "sam@veyrohealth.com",
} satisfies TemplateEntry;
