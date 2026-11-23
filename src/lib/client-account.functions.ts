import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type TherapistLite = {
  id: string;
  display_name: string;
  slug: string;
  photo_url: string | null;
  title: string | null;
};

async function fetchTherapists(ids: string[]): Promise<Record<string, TherapistLite>> {
  if (!ids.length) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("therapist_profiles")
    .select("id, display_name, slug, photo_url, title")
    .in("id", ids);
  const map: Record<string, TherapistLite> = {};
  for (const t of data ?? []) map[t.id] = t as TherapistLite;
  return map;
}

export const linkClientToExistingRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims?.email ?? "").toLowerCase();
    if (!email) return { linkedAppointments: 0, linkedClients: 0 };
    // Use admin to bypass RLS for the email-based backfill; only writes rows
    // that are unclaimed (client_user_id IS NULL) and match the caller's email.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: appts } = await supabaseAdmin
      .from("appointments")
      .update({ client_user_id: context.userId } as never)
      .is("client_user_id", null)
      .ilike("client_email", email)
      .select("id");
    const { data: links } = await supabaseAdmin
      .from("therapist_clients")
      .update({ client_user_id: context.userId } as never)
      .is("client_user_id", null)
      .ilike("client_email", email)
      .select("id");
    return {
      linkedAppointments: appts?.length ?? 0,
      linkedClients: links?.length ?? 0,
    };
  });

export const getMyClientAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const email = (context.claims?.email ?? "").trim().toLowerCase();

    if (email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      try {
        const { syncCalendlyAppointmentsForClient } = await import("@/lib/calendly-sync.server");
        await syncCalendlyAppointmentsForClient(email, userId);
      } catch (e) {
        console.error("[client-account] calendly sync failed:", e);
      }

      await supabaseAdmin
        .from("appointments")
        .update({ client_user_id: userId } as never)
        .is("client_user_id", null)
        .ilike("client_email", email);
      await supabaseAdmin
        .from("therapist_clients")
        .update({ client_user_id: userId } as never)
        .is("client_user_id", null)
        .ilike("client_email", email);
    }

    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, therapist_id, starts_at, ends_at, status, meeting_url, calendly_event_uri, client_note",
      )
      .eq("client_user_id", userId)
      .order("starts_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = data ?? [];
    const therapists = await fetchTherapists(Array.from(new Set(list.map((a) => a.therapist_id))));
    const now = Date.now();
    const withT = list.map((a) => ({ ...a, therapist: therapists[a.therapist_id] ?? null }));
    // Cancelled sessions never sit in "upcoming" — they belong in history.
    const upcoming = withT
      .filter((a) => new Date(a.starts_at).getTime() >= now && a.status !== "cancelled")
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
    const past = withT.filter(
      (a) => new Date(a.starts_at).getTime() < now || a.status === "cancelled",
    );
    // Reviews the client has already left (to mark past appointments).
    const therapistIds = Array.from(new Set(past.map((a) => a.therapist_id)));
    let reviewedTherapistIds: string[] = [];
    if (therapistIds.length) {
      const { data: revs } = await supabase
        .from("therapist_reviews")
        .select("therapist_id")
        .eq("client_user_id", userId)
        .in("therapist_id", therapistIds);
      reviewedTherapistIds = (revs ?? []).map((r) => r.therapist_id);
    }

    // Shared session notes the therapist has ticked as visible to this client.
    const { data: notesData } = await supabase
      .from("session_notes")
      .select("id, title, body, created_at, therapist_id, appointment_id")
      .eq("client_user_id", userId)
      .eq("shared", true)
      .order("created_at", { ascending: false });
    const noteList = notesData ?? [];
    const noteTherapistIds = Array.from(
      new Set(noteList.map((n) => n.therapist_id).filter(Boolean) as string[]),
    );
    const merged = {
      ...therapists,
      ...(await fetchTherapists(noteTherapistIds.filter((id) => !therapists[id]))),
    };
    const notes = noteList.map((n) => ({
      ...n,
      therapist: merged[n.therapist_id] ?? null,
    }));

    return { upcoming, past, reviewedTherapistIds, notes };
  });

const idSchema = z.object({ id: z.string().uuid() });

export const getMyClientAppointment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: appt, error } = await supabase
      .from("appointments")
      .select("id, therapist_id, starts_at, ends_at, status, meeting_url, calendly_event_uri")
      .eq("id", data.id)
      .eq("client_user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!appt) return { appointment: null, therapist: null, myReview: null };
    const therapists = await fetchTherapists([appt.therapist_id]);
    const { data: review } = await supabase
      .from("therapist_reviews")
      .select("id, rating, body, traits")
      .eq("therapist_id", appt.therapist_id)
      .eq("client_user_id", userId)
      .maybeSingle();
    // Session notes the therapist has shared for this specific appointment.
    const { data: notes } = await supabase
      .from("session_notes")
      .select("id, title, body, created_at")
      .eq("appointment_id", data.id)
      .eq("client_user_id", userId)
      .eq("shared", true)
      .order("created_at", { ascending: false });
    return {
      appointment: appt,
      therapist: therapists[appt.therapist_id] ?? null,
      myReview: review ?? null,
      notes: notes ?? [],
    };
  });

export const getMyReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("therapist_reviews")
      .select("id, therapist_id, rating, body, traits, created_at, updated_at")
      .eq("client_user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = data ?? [];
    const therapists = await fetchTherapists(Array.from(new Set(list.map((r) => r.therapist_id))));
    return { reviews: list.map((r) => ({ ...r, therapist: therapists[r.therapist_id] ?? null })) };
  });

export const deleteMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("therapist_reviews")
      .delete()
      .eq("id", data.id)
      .eq("client_user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const noteSchema = z.object({
  appointmentId: z.string().uuid(),
  note: z.string().max(4000),
});

/** The pre-session note the patient shares with their chosen therapist. */
export const getMyAppointmentNote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ appointmentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("appointments")
      .select("id, starts_at, client_note")
      .eq("id", data.appointmentId)
      .eq("client_user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { note: null as string | null, editable: false };
    return {
      note: (row as { client_note: string | null }).client_note ?? null,
      editable: new Date(row.starts_at).getTime() > Date.now(),
    };
  });

export const saveMyAppointmentNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => noteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: readErr } = await supabase
      .from("appointments")
      .select("id, starts_at")
      .eq("id", data.appointmentId)
      .eq("client_user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Appointment not found.");
    if (new Date(row.starts_at).getTime() <= Date.now()) {
      throw new Error("This session has already started, so the note can no longer be changed.");
    }
    // Clients have no UPDATE policy on appointments (by design), so write the
    // single note column with the privileged client after verifying ownership.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const savedNote = data.note.trim() || null;
    const { data: updated, error } = await supabaseAdmin
      .from("appointments")
      .update({ client_note: savedNote } as never)
      .eq("id", data.appointmentId)
      .eq("client_user_id", userId)
      .select("client_note")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Your note could not be saved. Please try again.");
    return { ok: true, note: (updated as { client_note: string | null }).client_note };
  });
