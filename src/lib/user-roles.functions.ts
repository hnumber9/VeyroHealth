import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.object({ role: z.enum(["client", "therapist"]) });

export const assignMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ignore duplicates via unique(user_id, role).
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role } as never, {
        onConflict: "user_id,role",
        ignoreDuplicates: true,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role as "client" | "therapist" | "admin");
    return { roles };
  });
