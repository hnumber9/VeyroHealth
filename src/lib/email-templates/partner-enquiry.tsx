import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import { EmailLogo } from "./logo";
import type { TemplateEntry } from "./registry";

interface Props {
  organisationName?: string;
  contactName?: string;
  email?: string;
  jobTitle?: string;
  organisationType?: string;
  audienceSize?: string;
  interests?: string[];
  additionalInfo?: string;
  source?: string;
  enquiryId?: string;
}
function PartnerEnquiry(p: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New partner enquiry from ${p.organisationName ?? "an organisation"}`}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ padding: "24px", maxWidth: "560px" }}>
          <EmailLogo />
          <Heading>New partner enquiry</Heading>
          <Text>Organisation: {p.organisationName}</Text>
          <Text>
            Contact: {p.contactName}
            {p.jobTitle ? ` (${p.jobTitle})` : ""}
          </Text>
          <Text>Work email: {p.email}</Text>
          <Text>Organisation type: {p.organisationType}</Text>
          <Text>Approximate audience: {p.audienceSize || "Not given"}</Text>
          <Text>Interested in: {(p.interests ?? []).join(", ")}</Text>
          {p.additionalInfo ? (
            <Text style={{ whiteSpace: "pre-wrap" }}>
              Additional information: {p.additionalInfo}
            </Text>
          ) : null}
          <Text>Source / campaign: {p.source || "Direct"}</Text>
          <Text>
            Reply to this email to contact them. All enquiries are also listed in Admin → Partner
            enquiries.
          </Text>
          <Text>Reference: {p.enquiryId}</Text>
        </Container>
      </Body>
    </Html>
  );
}
export const template = {
  component: PartnerEnquiry,
  subject: (d: Record<string, any>) => `New partner enquiry — ${d.organisationName ?? "Veyro"}`,
  displayName: "Partner enquiry",
  to: "support@veyrohealth.com",
  previewData: {
    organisationName: "Riverside Medical Group",
    contactName: "Priya Shah",
    email: "priya@example.com",
    organisationType: "GP Practice / Medical Group",
    interests: ["Patient Mental Health Support"],
    source: "linkedin / email / gp-outreach",
  },
} satisfies TemplateEntry;
