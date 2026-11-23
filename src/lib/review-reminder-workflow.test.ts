import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handler: undefined as undefined | ((context: any) => Promise<unknown>),
  appointment: {
    id: "11111111-1111-4111-8111-111111111111",
    therapist_id: "therapist",
    client_user_id: "patient",
    client_email: "patient@example.com",
    client_name: "Patient",
    ends_at: "2026-10-28T12:00:00.000Z",
    status: "confirmed",
  },
  review: null as null | { id: string },
  send: vi.fn(),
}));

vi.mock("inngest", () => ({
  Inngest: class {
    createFunction(_options: unknown, handler: typeof mocks.handler) {
      mocks.handler = handler;
      return {};
    }
  },
  NonRetriableError: class extends Error {},
  RetryAfterError: class extends Error {},
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data:
            table === "appointments"
              ? { ...mocks.appointment }
              : table === "therapist_reviews"
                ? mocks.review
                : { display_name: "Therapist" },
          error: null,
        }),
      };
      return builder;
    },
  },
}));
vi.mock("./email-templates/send-email", () => ({ sendTemplateEmail: mocks.send }));

import { createReviewReminderWorkflow } from "./review-reminder.server";

describe("review reminder workflow", () => {
  beforeEach(() => {
    mocks.appointment.status = "confirmed";
    mocks.appointment.ends_at = "2026-10-28T12:00:00.000Z";
    mocks.review = null;
    mocks.send.mockReset().mockResolvedValue({ sent: true });
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-29T12:00:00Z"));
  });
  async function run(afterSleep?: (count: number) => void) {
    createReviewReminderWorkflow("test-signing-key");
    const sleepUntil = vi.fn(async () => {
      afterSleep?.(sleepUntil.mock.calls.length);
    });
    const handler = mocks.handler;
    if (!handler) throw new Error("Missing workflow");
    await handler({
      event: { data: { appointmentId: mocks.appointment.id, endsAt: "2026-10-28T12:00:00.000Z" } },
      step: { sleepUntil, run: async (_id: string, callback: () => unknown) => callback() },
    });
    return sleepUntil;
  }
  it("sleeps then sends one fixed review template with appointment idempotency", async () => {
    const sleep = await run();
    expect(sleep).toHaveBeenCalledWith("wait-after-session-0", "2026-10-29T12:00:00.000Z");
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(
      "review-reminder",
      "patient@example.com",
      expect.objectContaining({ idempotencyKey: `review-reminder-${mocks.appointment.id}` }),
    );
  });
  it("rechecks cancellation after the delay", async () => {
    await run(() => {
      mocks.appointment.status = "cancelled";
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rechecks an existing review after the delay", async () => {
    await run(() => {
      mocks.review = { id: "review" };
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("waits again when the appointment has moved", async () => {
    const sleep = await run((count) => {
      if (count === 1) mocks.appointment.ends_at = "2026-11-01T12:00:00.000Z";
      else vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-02T12:00:00Z"));
    });
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenLastCalledWith("wait-after-session-1", "2026-11-02T12:00:00.000Z");
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
