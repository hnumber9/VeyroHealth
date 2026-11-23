import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyBankDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("therapist_bank_details")
      .select("account_name, account_number, sort_code, bank_name, bank_address")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { details: data as null | Record<string, string | null> };
  });

const schema = z.object({
  account_name: z.string().trim().min(1).max(100),
  account_number: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "Account number must be 8 digits"),
  sort_code: z
    .string()
    .trim()
    .regex(/^\d{2}-?\d{2}-?\d{2}$/, "Sort code must be 6 digits"),
  bank_name: z.string().trim().max(100).nullable(),
  bank_address: z.string().trim().max(300).nullable(),
});

export const saveMyBankDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => schema.parse(i))
  .handler(async ({ data, context }) => {
    const digits = data.sort_code.replace(/-/g, "");
    const { error } = await (context.supabase as any).from("therapist_bank_details").upsert({
      user_id: context.userId,
      ...data,
      sort_code: `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`,
      bank_name: data.bank_name || null,
      bank_address: data.bank_address || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
