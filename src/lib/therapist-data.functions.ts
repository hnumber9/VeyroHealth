import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getMyTherapistId(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("therapist_profiles")
    .select("id, display_name, published, approved_at, rejected_at, rejection_reason")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const getTherapistDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const tp = await getMyTherapistId(supabase, userId);
    if (!tp) return { therapist: null, clients: [], notes: [], upcoming: [] };

    // Sync from Calendly so upcoming appointments reflect real bookings even
    // when the webhook subscription failed at OAuth time.
    try {
      const { syncCalendlyAppointmentsForTherapist } = await import("@/lib/calendly-sync.server");
      await syncCalendlyAppointmentsForTherapist(tp.id);
    } catch (e) {
      console.error("[therapist-data] calendly sync failed:", e);
    }

    // Repair any Cal.com reschedule or cancellation whose webhook never landed.
    try {
      const { reconcileTherapistAppointments } = await import("@/lib/calcom-reconcile.server");
      // Cap the wait so a slow Cal.com never stalls the dashboard; the
      // remaining repairs finish on a later load (throttled per therapist).
      await Promise.race([
        reconcileTherapistAppointments(tp.id),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    } catch (e) {
      console.error("[therapist-data] calcom reconcile failed:", e);
    }

    const { data: links } = await supabase
      .from("therapist_clients")
      .select("id, client_user_id, client_email, created_at")
      .eq("therapist_id", tp.id)
      .order("created_at", { ascending: false });

    const { data: apptRows } = await supabase
      .from("appointments")
      .select("client_email, client_name, starts_at")
      .eq("therapist_id", tp.id)
      .order("starts_at", { ascending: false });

    // Only surface clients who have actually booked an appointment (via
    // Calendly). Manual "add client" is invite-only and never creates a link.
    const bookedEmails = new Set(
      (apptRows ?? []).map((a) => (a.client_email ?? "").trim().toLowerCase()).filter(Boolean),
    );
    const visibleLinks = (links ?? []).filter((l) =>
      bookedEmails.has((l.client_email ?? "").trim().toLowerCase()),
    );

    const clientIds = visibleLinks.map((l) => l.client_user_id).filter(Boolean) as string[];
    let namesById: Record<
      string,
      { first_name: string | null; last_name: string | null; email: string | null }
    > = {};
    if (clientIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", clientIds);
      namesById = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));
    }
    const linkedByEmail = new Map(
      visibleLinks.map((l) => [(l.client_email ?? "").trim().toLowerCase(), l]),
    );
    // Build the visible client list from appointments so anyone who booked
    // shows up even if the therapist_clients row is missing.
    const seen = new Set<string>();
    const clients: Array<{
      id: string;
      client_user_id: string | null;
      client_email: string;
      profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
      client_name: string | null;
    }> = [];
    for (const a of apptRows ?? []) {
      const email = (a.client_email ?? "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const link = linkedByEmail.get(email);
      clients.push({
        id: link?.id ?? `appt:${email}`,
        client_user_id: link?.client_user_id ?? null,
        client_email: link?.client_email ?? email,
        profile: link?.client_user_id ? (namesById[link.client_user_id] ?? null) : null,
        client_name: a.client_name ?? null,
      });
    }
    void namesById;

    const { data: notes } = await supabase
      .from("session_notes")
      .select("id, title, body, shared, created_at, client_user_id, client_email, appointment_id")
      .eq("therapist_id", tp.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: upcoming } = await supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, meeting_url, status, client_name, client_email, calcom_booking_uid, updated_at, client_note",
      )
      .eq("therapist_id", tp.id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);

    const { data: recentPast } = await supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, meeting_url, status, client_name, client_email, calcom_booking_uid, updated_at, client_note",
      )
      .eq("therapist_id", tp.id)
      .lt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: false })
      .limit(50);

    // Cancelled sessions never sit in the upcoming list — they only remain in
    // the history list for a week after they were cancelled.
    const cancelledCutoff = Date.now() - 7 * 86_400_000;
    const allUpcoming = upcoming ?? [];
    const visibleUpcoming = allUpcoming.filter((a) => a.status !== "cancelled");
    const recentlyCancelled = allUpcoming.filter(
      (a) => a.status === "cancelled" && new Date(a.updated_at).getTime() >= cancelledCutoff,
    );

    return {
      therapist: tp,
      clients,
      notes: notes ?? [],
      upcoming: visibleUpcoming,
      recentAppointments: [...visibleUpcoming, ...recentlyCancelled, ...(recentPast ?? [])],
    };
  });

const createNoteSchema = z.object({
  client_email: z.string().trim().toLowerCase().email(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  shared: z.boolean().optional(),
  appointment_id: z.string().uuid().nullable().optional(),
});

export const createSessionNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createNoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const tp = await getMyTherapistId(supabase, userId);
    if (!tp) throw new Error("You don't have a therapist profile yet.");

    // Look up client by email (admin: profile is private to that user)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clientProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", data.client_email)
      .maybeSingle();
    const clientUserId = clientProfile?.user_id ?? null;

    // Upsert link
    const { data: existingLink } = await supabase
      .from("therapist_clients")
      .select("id")
      .eq("therapist_id", tp.id)
      .eq("client_email", data.client_email)
      .maybeSingle();
    if (!existingLink) {
      await supabase.from("therapist_clients").insert({
        therapist_id: tp.id,
        client_email: data.client_email,
        client_user_id: clientUserId,
        linked_via: "manual",
      });
    } else if (clientUserId) {
      await supabase
        .from("therapist_clients")
        .update({ client_user_id: clientUserId })
        .eq("id", existingLink.id);
    }

    const { data: note, error } = await supabase
      .from("session_notes")
      .insert({
        therapist_id: tp.id,
        client_user_id: clientUserId,
        client_email: data.client_email,
        title: data.title,
        body: data.body,
        shared: data.shared ?? false,
        appointment_id: data.appointment_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { note, clientLinked: Boolean(clientUserId) };
  });

const inviteClientSchema = z.object({
  client_email: z.string().trim().toLowerCase().email(),
});

// Invite-only: does NOT create a therapist_clients link. A client only shows
// up in the therapist's clients list after they book an appointment via
// Calendly (the webhook creates the link at that point).
export const addClientByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteClientSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const tp = await getMyTherapistId(supabase, userId);
    if (!tp) throw new Error("You don't have a therapist profile yet.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clientProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", data.client_email)
      .maybeSingle();

    if (clientProfile?.user_id) {
      return { ok: true, inviteSent: false, inviteSkippedReason: "already_has_account" as const };
    }

    try {
      const { enqueueClientInviteEmail } = await import("@/lib/client-invite-email.server");
      await enqueueClientInviteEmail({
        recipientEmail: data.client_email,
        therapistName: tp.display_name ?? null,
      });
      return { ok: true, inviteSent: true, inviteSkippedReason: null };
    } catch (err) {
      console.error("[addClientByEmail] invite enqueue failed", err);
      throw new Error("Couldn't send the invite email. Please try again.");
    }
  });
