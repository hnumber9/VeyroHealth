import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ appointmentId: z.string().uuid() });

/**
 * UI-triggered resend of the booking confirmation. Authorised for the client
 * on the appointment. The Calendly webhook calls the underlying helper
 * directly (see send-booking-confirmation.server.ts).
 */
export const sendBookingConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, client_user_id, client_email")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (!appt) return { success: false, error: "Appointment not found" };
    const callerEmail = (context.claims?.email ?? "").toLowerCase();
    const owns =
      (appt.client_user_id && appt.client_user_id === context.userId) ||
      (!!callerEmail && callerEmail === (appt.client_email ?? "").toLowerCase());
    if (!owns) return { success: false, error: "Not authorised for this appointment" };

    const { sendBookingConfirmationForAppointment } =
      await import("@/lib/send-booking-confirmation.server");
    return sendBookingConfirmationForAppointment(data.appointmentId, { force: true });
  });
