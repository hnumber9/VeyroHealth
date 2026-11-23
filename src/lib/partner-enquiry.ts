import { z } from "zod";

export const PARTNER_CONSENT =
  "I agree to Veyro Health using the details in this form to respond to my partnership enquiry, as described in the Privacy Policy.";

export const PARTNER_ORG_TYPES = [
  "GP Practice / Medical Group",
  "Private Hospital / Healthcare Clinic",
  "Care Home / Care Provider",
  "Corporate Employer",
  "Membership Organisation",
  "Wellbeing / Employee Benefits Provider",
  "Other",
] as const;

export const PARTNER_AUDIENCE_SIZES = [
  "Under 100",
  "100–500",
  "501–1,000",
  "1,001–5,000",
  "5,000+",
] as const;

export const PARTNER_INTERESTS = [
  "Patient Mental Health Support",
  "Employee Wellbeing",
  "Membership Benefits",
  "White-Label Therapy Platform",
  "Commission-Sharing Partnership",
  "Other",
] as const;

export const PARTNER_SOURCE_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "referrer",
  "landing_page",
] as const;

const sourceValue = z.string().trim().max(500).optional();
export const partnerSourceSchema = z
  .object(
    Object.fromEntries(PARTNER_SOURCE_KEYS.map((k) => [k, sourceValue])) as Record<
      (typeof PARTNER_SOURCE_KEYS)[number],
      typeof sourceValue
    >,
  )
  .partial()
  .default({});

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const partnerEnquirySchema = z.object({
  organisationName: z.string().trim().min(1, "Enter your organisation name.").max(200),
  contactName: z.string().trim().min(1, "Enter your name.").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid work email address.").max(320),
  jobTitle: optionalText(200),
  organisationType: z.enum(PARTNER_ORG_TYPES, {
    errorMap: () => ({ message: "Choose your organisation type." }),
  }),
  audienceSize: z
    .union([z.enum(PARTNER_AUDIENCE_SIZES), z.literal("")])
    .optional()
    .default(""),
  interests: z
    .array(z.enum(PARTNER_INTERESTS))
    .min(1, "Choose at least one option.")
    .max(PARTNER_INTERESTS.length),
  additionalInfo: optionalText(3000),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please tick the box to agree before submitting." }),
  }),
  source: partnerSourceSchema,
  website: z.string().max(0).default(""),
});

export type PartnerEnquiryInput = z.input<typeof partnerEnquirySchema>;
export type PartnerSource = z.infer<typeof partnerSourceSchema>;

/** Reads campaign details (UTM tags, ref, referrer, landing page) from a visit. */
export function readPartnerSource(url: string, referrer: string): PartnerSource {
  const u = new URL(url);
  const out: PartnerSource = {};
  for (const k of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
  ] as const) {
    const v = u.searchParams.get(k)?.trim();
    if (v) out[k] = v.slice(0, 500);
  }
  if (referrer) {
    try {
      const r = new URL(referrer);
      if (r.host !== u.host) out.referrer = `${r.origin}${r.pathname}`.slice(0, 500);
    } catch {
      /* ignore malformed referrer */
    }
  }
  out.landing_page = `${u.pathname}${u.search}`.slice(0, 500);
  return out;
}

/** One-line summary of where an enquiry came from, for admin and email. */
export function describePartnerSource(s: PartnerSource | null | undefined): string {
  if (!s) return "Direct";
  const parts = [s.utm_source, s.utm_medium, s.utm_campaign].filter(Boolean);
  if (parts.length) return parts.join(" / ");
  if (s.ref) return `ref: ${s.ref}`;
  if (s.referrer) return s.referrer;
  return "Direct";
}
