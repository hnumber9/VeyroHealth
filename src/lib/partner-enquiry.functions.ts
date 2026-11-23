import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  describePartnerSource,
  PARTNER_CONSENT,
  partnerEnquirySchema,
  type PartnerSource,
} from "./partner-enquiry";

const ALLOWED_ORIGINS = [
  "https://veyrohealth.com",
  "https://www.veyrohealth.com",
  "https://veyro-join-launch.lovable.app",
  "https://id-preview--be78a48d-d6e2-4e8c-9965-280dce04b280.lovable.app",
];

export const submitPartnerEnquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => partnerEnquirySchema.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const origin = request.headers.get("origin");
    const allowed = new Set([new URL(request.url).origin, ...ALLOWED_ORIGINS]);
    if (!origin || !allowed.has(origin))
      throw new Error("Please submit the form from the Veyro website.");
    const secret = process.env["LOVABLE_API_KEY"];
    if (!secret)
      throw new Error(
        "Enquiries are temporarily unavailable. Please email support@veyrohealth.com.",
      );
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const ip = request.headers.get("cf-connecting-ip") ?? "local-preview";
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`partner:${ip}`));
    const rateKey = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: id, error } = await supabaseAdmin.rpc("submit_partner_enquiry", {
      p_org: data.organisationName,
      p_contact: data.contactName,
      p_email: data.email,
      p_job: data.jobTitle || null,
      p_type: data.organisationType,
      p_size: data.audienceSize || null,
      p_interests: data.interests,
      p_info: data.additionalInfo || null,
      p_consent: PARTNER_CONSENT,
      p_source: data.source,
      p_rate_key: rateKey,
    } as never);
    if (error || !id) {
      throw new Error(
        error?.message.includes("partner_rate_limit")
          ? "Too many enquiries from this connection. Please try again in an hour."
          : "Your enquiry couldn't be saved. Please try again.",
      );
    }
    for (const recipient of PARTNER_NOTIFY_TO) {
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("partner-enquiry", recipient, {
          templateData: {
            organisationName: data.organisationName,
            contactName: data.contactName,
            email: data.email,
            jobTitle: data.jobTitle,
            organisationType: data.organisationType,
            audienceSize: data.audienceSize,
            interests: data.interests,
            additionalInfo: data.additionalInfo,
            source: describePartnerSource(data.source),
            enquiryId: id,
          },
          replyTo: data.email,
          idempotencyKey: `partner-enquiry-${id}-${recipient}`,
        });
      } catch {
        console.error("[partners] Notification unavailable; enquiry retained.");
      }
    }
    return { saved: true };
  });

const PARTNER_NOTIFY_TO = ["support@veyrohealth.com", "sam@veyrohealth.com"] as const;

async function assertAdmin(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("We couldn't verify your access. Please try again.");
  if (!data) throw new Error("Forbidden");
}

export const listPartnerEnquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("partner_enquiries")
      .select(
        "id, organisation_name, contact_name, email, job_title, organisation_type, audience_size, interests, additional_info, source, status, admin_notes, consent_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error("Couldn't load partner enquiries. Please try again.");
    return {
      enquiries: (data ?? []).map((r) => ({
        ...r,
        source: (r.source ?? {}) as PartnerSource,
        source_label: describePartnerSource(r.source as PartnerSource),
      })),
    };
  });

export const updatePartnerEnquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "closed"]),
        adminNotes: z.string().trim().max(5000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_enquiries")
      .update({
        status: data.status,
        admin_notes: data.adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error("Couldn't save that change. Please try again.");
    return { ok: true };
  });
