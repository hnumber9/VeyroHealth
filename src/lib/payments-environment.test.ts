import { describe, expect, it } from "vitest";
import { startBookingInputSchema } from "./booking-schema";
import { isWebhookEnvironmentAllowed, stripeEnvironmentFor } from "./payments-environment";
import { timingSafeEqualString, verifyWebhook } from "./stripe.server";

const validBooking = {
  therapistId: "11111111-1111-4111-8111-111111111111",
  serviceId: "22222222-2222-4222-8222-222222222222",
  slotStart: "2026-12-01T10:00:00.000Z",
  clientName: "Test Patient",
  clientEmail: "patient@example.com",
  returnUrl: "https://veyrohealth.com/booking/confirmation",
};

describe("production bookings can't be created in sandbox mode", () => {
  it("drops an environment the browser tries to send", () => {
    const parsed = startBookingInputSchema.parse({ ...validBooking, environment: "sandbox" });
    expect("environment" in parsed).toBe(false);
  });

  it("always uses live on the published build, whatever the request claims", () => {
    expect(stripeEnvironmentFor({ isProductionBuild: true, host: "veyrohealth.com" })).toBe("live");
    expect(stripeEnvironmentFor({ isProductionBuild: true, host: "localhost" })).toBe("live");
    expect(stripeEnvironmentFor({ isProductionBuild: true, host: null })).toBe("live");
  });

  it("uses live on veyrohealth.com even outside the published build", () => {
    expect(stripeEnvironmentFor({ isProductionBuild: false, host: "veyrohealth.com" })).toBe(
      "live",
    );
    expect(
      stripeEnvironmentFor({ isProductionBuild: false, host: "www.veyrohealth.com:443" }),
    ).toBe("live");
  });

  it("uses sandbox only in preview", () => {
    expect(
      stripeEnvironmentFor({
        isProductionBuild: false,
        host: "id-preview--be78a48d-d6e2-4e8c-9965-280dce04b280.lovable.app",
      }),
    ).toBe("sandbox");
  });
});

describe("payments webhook environment", () => {
  it("rejects sandbox events in production and accepts live", () => {
    expect(isWebhookEnvironmentAllowed("sandbox", { isProductionBuild: true })).toBe(false);
    expect(isWebhookEnvironmentAllowed("live", { isProductionBuild: true })).toBe(true);
  });

  it("accepts sandbox events in preview", () => {
    expect(
      isWebhookEnvironmentAllowed("sandbox", { isProductionBuild: false, host: "localhost" }),
    ).toBe(true);
  });
});

describe("webhook signature check", () => {
  it("compares strings correctly", () => {
    expect(timingSafeEqualString("abc123", "abc123")).toBe(true);
    expect(timingSafeEqualString("abc123", "abc124")).toBe(false);
    expect(timingSafeEqualString("abc", "abc123")).toBe(false);
  });

  async function signedRequest(secret: string, body: string) {
    const t = Math.floor(Date.now() / 1000).toString();
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = Buffer.from(
      new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)),
      ),
    ).toString("hex");
    return new Request("https://example.com/api/public/payments/webhook?env=sandbox", {
      method: "POST",
      body,
      headers: { "stripe-signature": `t=${t},v1=${sig}` },
    });
  }

  it("accepts a correctly signed event and rejects a wrong secret", async () => {
    process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"] = "whsec_test_secret";
    const body = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: {} },
    });
    await expect(
      verifyWebhook(await signedRequest("whsec_test_secret", body), "sandbox"),
    ).resolves.toMatchObject({ id: "evt_1" });
    await expect(
      verifyWebhook(await signedRequest("whsec_wrong", body), "sandbox"),
    ).rejects.toThrow("Invalid webhook signature");
  });
});
