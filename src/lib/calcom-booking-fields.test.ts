import { describe, expect, it } from "vitest";
import {
  autoBookingFieldResponses,
  describeCalcomBookingFailure,
  missingRequiredBookingFields,
} from "./calcom-booking-fields";

describe("Cal.com required booking questions", () => {
  it("reads the missing title question from Cal.com's rejection", () => {
    expect(missingRequiredBookingFields("responses - {title}error_required_field")).toEqual([
      "title",
    ]);
  });
  it("answers the title question with the session title", () => {
    expect(autoBookingFieldResponses(["title"], "Therapy Session with Ana Moore")).toEqual({
      title: "Therapy Session with Ana Moore",
    });
  });
  it("never invents a phone number", () => {
    expect(autoBookingFieldResponses(["attendeePhoneNumber"], "x")).toEqual({});
  });
  it("tells admins a phone-only session must be changed in Cal.com", () => {
    expect(
      describeCalcomBookingFailure(
        "Event type with id=7111551 requires attendee phone number as the location.",
      ),
    ).toMatch(/phone number/);
  });
});
