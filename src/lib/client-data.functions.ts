import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyClientData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string })?.email ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", userId)
      .maybeSingle();

    // Backfill: link any prior bookings made with this user's email but
    // without a client_user_id (e.g. Calendly-booked before sign-up).
    const normalizedEmail = (email ?? profile?.email ?? "").toLowerCase();
    if (normalizedEmail) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Pull latest bookings from Calendly for every connected therapist so
      // the dashboard reflects reality even if webhooks never fired.
      try {
        const { syncCalendlyAppointmentsForClient } = await import("@/lib/calendly-sync.server");
        await syncCalendlyAppointmentsForClient(normalizedEmail, userId);
      } catch (e) {
        console.error("[client-data] calendly sync failed:", e);
      }
      await supabaseAdmin
        .from("appointments")
        .update({ client_user_id: userId })
        .eq("client_email", normalizedEmail)
        .is("client_user_id", null);
      await supabaseAdmin
        .from("booking_intents")
        .update({ client_user_id: userId })
        .eq("client_email", normalizedEmail)
        .is("client_user_id", null);
      await supabaseAdmin
        .from("therapist_clients")
        .update({ client_user_id: userId })
        .eq("client_email", normalizedEmail)
        .is("client_user_id", null);
    }

    const { data: appointments } = await supabase
      .from("appointments")
      .select("id, starts_at, ends_at, meeting_url, status, therapist_id")
      .eq("client_user_id", userId)
      .order("starts_at", { ascending: true });

    const { data: notes } = await supabase
      .from("session_notes")
      .select("id, title, body, created_at, therapist_id")
      .eq("client_user_id", userId)
      .eq("shared", true)
      .order("created_at", { ascending: false });

    const therapistIds = Array.from(
      new Set(
        [
          ...(appointments ?? []).map((a) => a.therapist_id),
          ...(notes ?? []).map((n) => n.therapist_id),
        ].filter(Boolean),
      ),
    );
    let therapistsById: Record<string, { display_name: string; slug: string }> = {};
    if (therapistIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: tps } = await supabaseAdmin
        .from("therapist_profiles")
        .select("id, display_name, slug")
        .in("id", therapistIds);
      therapistsById = Object.fromEntries(
        (tps ?? []).map((t) => [t.id, { display_name: t.display_name, slug: t.slug }]),
      );
    }

    return {
      profile: profile ?? { first_name: null, last_name: null, email },
      appointments: (appointments ?? []).map((a) => ({
        ...a,
        therapist: therapistsById[a.therapist_id] ?? null,
      })),
      notes: (notes ?? []).map((n) => ({
        ...n,
        therapist: therapistsById[n.therapist_id] ?? null,
      })),
    };
  });
