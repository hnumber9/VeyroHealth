import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const cancelMyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ appointmentId: z.string().uuid(), reason: z.string().max(300).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: appt } = await context.supabase
      .from("appointments")
      .select("id")
      .eq("id", data.appointmentId)
      .eq("client_user_id", context.userId)
      .maybeSingle();
    if (!appt) return { ok: false as const, error: "Session not found." };
    const { cancelAppointmentCore } = await import("@/lib/appointment-actions.server");
    return cancelAppointmentCore(appt.id, data.reason);
  });
