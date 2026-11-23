import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { MATCHING_CONSENT, matchingEnquirySchema } from "./matching-enquiry";

export const submitMatchingEnquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => matchingEnquirySchema.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const origin = request.headers.get("origin");
    const allowed = new Set([
      new URL(request.url).origin,
      "https://veyrohealth.com",
      "https://www.veyrohealth.com",
      "https://veyro-join-launch.lovable.app",
      "https://id-preview--be78a48d-d6e2-4e8c-9965-280dce04b280.lovable.app",
    ]);
    if (!origin || !allowed.has(origin)) throw new Error("Please submit the form from Veyro.");
    const secret = process.env["LOVABLE_API_KEY"];
    if (!secret)
      throw new Error(
        "Matching requests are temporarily unavailable. Please contact support@veyrohealth.com.",
      );
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const ip = request.headers.get("cf-connecting-ip") ?? "local-preview";
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
    const rateKey = Array.from(new Uint8Array(signature), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: id, error } = await supabaseAdmin.rpc("submit_matching_enquiry", {
      p_email: data.email,
      p_help: data.helpWith,
      p_gender: data.gender,
      p_age: data.age,
      p_consent: MATCHING_CONSENT,
      p_rate_key: rateKey,
    });
    if (error || !id)
      throw new Error(
        error?.message.includes("matching_rate_limit")
          ? "Too many requests. Please try again in an hour."
          : "Your request could not be saved. Please try again.",
      );
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const result = await sendTemplateEmail("matching-enquiry", "sam@veyrohealth.com", {
        templateData: {
          email: data.email,
          helpWith: data.helpWith,
          gender: data.gender,
          age: data.age,
          enquiryId: id,
        },
        replyTo: data.email,
        idempotencyKey: `matching-enquiry-${id}`,
      });
      return { saved: true, notified: result.sent };
    } catch {
      // Do not log sensitive enquiry contents or lose the saved request on delivery failure.
      console.error("[matching] Notification unavailable; request retained.");
      return { saved: true, notified: false };
    }
  });
