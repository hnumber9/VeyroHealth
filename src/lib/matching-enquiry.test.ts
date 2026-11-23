import { describe, expect, it } from "vitest";
import { matchingEnquirySchema } from "./matching-enquiry";

const valid = {
  email: "patient@example.com",
  helpWith: "Finding support",
  gender: "No preference",
  age: "No preference",
  consent: true,
};
describe("matching enquiry consent", () => {
  it("rejects a request without explicit consent", () => {
    expect(matchingEnquirySchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(matchingEnquirySchema.safeParse({ ...valid, consent: undefined }).success).toBe(false);
  });
  it("accepts the requested fields with explicit consent", () => {
    expect(matchingEnquirySchema.parse(valid)).toMatchObject(valid);
  });
});
