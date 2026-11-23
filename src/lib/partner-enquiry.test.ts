import { describe, expect, it } from "vitest";
import { describePartnerSource, partnerEnquirySchema, readPartnerSource } from "./partner-enquiry";

const valid = {
  organisationName: "Riverside Medical Group",
  contactName: "Priya Shah",
  email: "Priya@Riverside.nhs.uk",
  organisationType: "GP Practice / Medical Group",
  interests: ["Patient Mental Health Support"],
  consent: true,
};

describe("partner enquiry form", () => {
  it("requires organisation name, contact name, work email, organisation type and an interest", () => {
    for (const key of ["organisationName", "contactName", "email", "organisationType"] as const) {
      expect(partnerEnquirySchema.safeParse({ ...valid, [key]: "" }).success).toBe(false);
    }
    expect(partnerEnquirySchema.safeParse({ ...valid, interests: [] }).success).toBe(false);
  });
  it("keeps job title, audience size and additional information optional", () => {
    const parsed = partnerEnquirySchema.parse(valid);
    expect(parsed.jobTitle).toBe("");
    expect(parsed.audienceSize).toBe("");
    expect(parsed.email).toBe("priya@riverside.nhs.uk");
  });
  it("rejects a submission without the consent box ticked", () => {
    expect(partnerEnquirySchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });
});

describe("enquiry source tracking", () => {
  it("captures UTM campaign tags and the landing page", () => {
    const s = readPartnerSource(
      "https://veyrohealth.com/partners?utm_source=linkedin&utm_medium=email&utm_campaign=gp-outreach",
      "",
    );
    expect(s).toMatchObject({
      utm_source: "linkedin",
      utm_medium: "email",
      utm_campaign: "gp-outreach",
      landing_page: "/partners?utm_source=linkedin&utm_medium=email&utm_campaign=gp-outreach",
    });
    expect(describePartnerSource(s)).toBe("linkedin / email / gp-outreach");
  });
  it("records an outside referrer and labels a plain visit as Direct", () => {
    expect(
      readPartnerSource("https://veyrohealth.com/partners", "https://www.google.com/search?q=x")
        .referrer,
    ).toBe("https://www.google.com/search");
    expect(
      describePartnerSource(
        readPartnerSource("https://veyrohealth.com/partners", "https://veyrohealth.com/"),
      ),
    ).toBe("Direct");
  });
});
