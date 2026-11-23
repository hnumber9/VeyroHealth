import { z } from "zod";

export const MATCHING_DELAY_MS = 30000;
export const MATCHING_CONSENT =
  "I consent to Veyro using my information, including mental health details, to help match me with a therapist and contact me about my enquiry. I can withdraw consent at any time. Privacy Policy.";
export const MATCHING_GENDERS = ["No preference", "Female", "Male", "Non-binary"] as const;
export const MATCHING_AGES = [
  "No preference",
  "Under 30",
  "30–39",
  "40–49",
  "50–59",
  "60+",
] as const;
export const matchingEnquirySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(320),
  helpWith: z.string().trim().min(1, "Tell us what you'd like help with.").max(2000),
  gender: z.enum(MATCHING_GENDERS),
  age: z.enum(MATCHING_AGES),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please agree to the privacy consent before submitting." }),
  }),
  website: z.string().max(0).default(""),
});
