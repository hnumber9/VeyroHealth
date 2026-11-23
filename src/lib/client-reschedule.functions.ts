import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ownsAppointment(
  supabase: { from: (t: "appointments") => any },
  userId: string,
  appointmentId: string,
) {
  const { data } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", appointmentId)
    .eq("client_user_id", userId)
    .maybeSingle();
  return !!data;
}

/** Slots the client can move an already-paid session to. */
export const getMyRescheduleSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        appointmentId: z.string().uuid(),
        from: z.string().min(8).max(40),
        to: z.string().min(8).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await ownsAppointment(context.supabase, context.userId, data.appointmentId))) {
      return { slots: [] as string[], reason: "unavailable" as const };
    }
    const { getRescheduleSlotsCore } = await import("@/lib/appointment-actions.server");
    return getRescheduleSlotsCore(data.appointmentId, data.from, data.to);
  });

/** Move a paid session to a new slot. No extra payment is taken. */
export const rescheduleMyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ appointmentId: z.string().uuid(), slotStart: z.string().min(8).max(40) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await ownsAppointment(context.supabase, context.userId, data.appointmentId))) {
      return { ok: false as const, error: "Session not found." };
    }
    const { rescheduleAppointmentCore } = await import("@/lib/appointment-actions.server");
    return rescheduleAppointmentCore(data.appointmentId, data.slotStart);
  });
