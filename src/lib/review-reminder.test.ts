import { describe, expect, it } from "vitest";
import { canSendReviewReminder, reviewReminderAt } from "./review-reminder";

describe("post-session review reminders", () => {
  const end = "2026-10-28T12:00:00.000Z";
  it("waits 24 hours after the session ends", () => {
    expect(reviewReminderAt(end)).toBe("2026-10-29T12:00:00.000Z");
    expect(canSendReviewReminder("confirmed", end, Date.parse("2026-10-29T11:59:59Z"), false)).toBe(
      false,
    );
    expect(canSendReviewReminder("confirmed", end, Date.parse("2026-10-29T12:00:00Z"), false)).toBe(
      true,
    );
  });
  it("skips cancelled appointments", () => {
    expect(canSendReviewReminder("cancelled", end, Date.parse("2026-10-30T00:00:00Z"), false)).toBe(
      false,
    );
  });
  it("skips patients who already reviewed the therapist", () => {
    expect(canSendReviewReminder("completed", end, Date.parse("2026-10-30T00:00:00Z"), true)).toBe(
      false,
    );
  });
  it("waits for a rescheduled session to finish", () => {
    expect(
      canSendReviewReminder(
        "confirmed",
        "2026-11-01T12:00:00Z",
        Date.parse("2026-10-29T00:00:00Z"),
        false,
      ),
    ).toBe(false);
  });
});
