import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Public "Manage my booking" actions. The long random token from the patient's
 * email is the only credential, so every handler re-validates it server-side.
 */
const tokenSchema = z.string().min(32).max(128);

export const getBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { resolveManageToken } = await import("@/lib/appointment-actions.server");
    const appt = await resolveManageToken(data.token);
    if (!appt) return { booking: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tp } = await supabaseAdmin
      .from("therapist_profiles")
      .select("display_name, slug")
      .eq("id", appt.therapist_id)
      .maybeSingle();
    return {
      booking: {
        clientName: appt.client_name,
        startsAt: appt.starts_at,
        endsAt: appt.ends_at,
        status: appt.status,
        meetingUrl: appt.meeting_url,
        serviceName: appt.service_name,
        note: appt.client_note,
        therapistName: tp?.display_name ?? "Your therapist",
        therapistSlug: tp?.slug ?? null,
      },
    };
  });

export const cancelByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: tokenSchema, reason: z.string().max(300).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { resolveManageToken, cancelAppointmentCore } =
      await import("@/lib/appointment-actions.server");
    const appt = await resolveManageToken(data.token);
    if (!appt) return { ok: false as const, error: "This link is no longer valid." };
    return cancelAppointmentCore(appt.id, data.reason);
  });

export const rescheduleSlotsByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: tokenSchema,
        from: z.string().min(8).max(40),
        to: z.string().min(8).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { resolveManageToken, getRescheduleSlotsCore } =
      await import("@/lib/appointment-actions.server");
    const appt = await resolveManageToken(data.token);
    if (!appt) return { slots: [] as string[], reason: "unavailable" as const };
    return getRescheduleSlotsCore(appt.id, data.from, data.to);
  });

export const rescheduleByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: tokenSchema, slotStart: z.string().min(8).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { resolveManageToken, rescheduleAppointmentCore } =
      await import("@/lib/appointment-actions.server");
    const appt = await resolveManageToken(data.token);
    if (!appt) return { ok: false as const, error: "This link is no longer valid." };
    return rescheduleAppointmentCore(appt.id, data.slotStart);
  });

export const getNoteByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }) => {
    const { resolveManageToken } = await import("@/lib/appointment-actions.server");
    const appt = await resolveManageToken(data.token);
    if (!appt) return { note: null as string | null, editable: false };
    return {
      note: appt.client_note ?? null,
      editable: appt.status !== "cancelled" && new Date(appt.starts_at).getTime() > Date.now(),
    };
  });

export const saveNoteByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: tokenSchema, note: z.string().max(4000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { resolveManageToken } = await import("@/lib/appointment-actions.server");
    const appt = await resolveManageToken(data.token);
    if (!appt) throw new Error("This link is no longer valid.");
    if (new Date(appt.starts_at).getTime() <= Date.now()) {
      throw new Error("This session has already started, so the note can no longer be changed.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const savedNote = data.note.trim() || null;
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ client_note: savedNote })
      .eq("id", appt.id);
    if (error) throw new Error(error.message);
    return { ok: true, note: savedNote };
  });
