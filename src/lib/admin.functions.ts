import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Verifies the caller holds the admin role (via their own RLS-visible roles). */
async function assertAdmin(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) {
    console.error("[admin] role check failed", error);
    throw new Error("We couldn't verify your access. Please try again.");
  }
  if (!data) throw new Error("Forbidden");
}

export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertAdmin(context.supabase, context.userId);
      return { isAdmin: true };
    } catch {
      return { isAdmin: false };
    }
  });

export const listTherapistsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("therapist_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin] list therapists failed", error);
      throw new Error("We couldn't load therapists right now. Please try again.");
    }
    const rows = data ?? [];
    const emails: Record<string, string | null> = {};
    type Bank = {
      account_name: string;
      account_number: string;
      sort_code: string;
      bank_name: string | null;
      bank_address: string | null;
    };
    const banks: Record<string, Bank> = {};
    if (rows.length) {
      const ids = rows.map((r) => r.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .in("user_id", ids);
      for (const p of profiles ?? []) emails[p.user_id] = p.email;
      const { data: bankRows } = await (supabaseAdmin as any)
        .from("therapist_bank_details")
        .select("user_id, account_name, account_number, sort_code, bank_name, bank_address")
        .in("user_id", ids);
      for (const b of (bankRows ?? []) as (Bank & { user_id: string })[]) banks[b.user_id] = b;
    }
    return {
      therapists: rows.map((r) => ({
        ...r,
        email: emails[r.user_id] ?? null,
        bank_details: banks[r.user_id] ?? null,
      })),
    };
  });

const idSchema = z.object({ id: z.string().uuid() });

export const setTherapistProfileVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), published: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("therapist_profiles")
      .update({ published: data.published })
      .eq("id", data.id)
      .not("approved_at", "is", null)
      .is("rejected_at", null)
      .select("id")
      .single();
    if (error || !profile) {
      console.error("[admin] visibility update failed", error);
      throw new Error("Only approved, non-rejected profiles can be shown or hidden.");
    }
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: data.published ? "therapist_shown" : "therapist_hidden",
      target_type: "therapist_profile",
      target_id: profile.id,
    });
    return { ok: true };
  });

export const approveTherapistProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("therapist_profiles")
      .update({
        published: true,
        approved_at: new Date().toISOString(),
        rejected_at: null,
        rejection_reason: null,
      })
      .eq("id", data.id)
      .select("id, user_id, display_name, slug")
      .single();
    if (error || !profile) {
      console.error("[admin] approve failed", error);
      throw new Error("We couldn't approve this profile. Please try again.");
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: profile.user_id, role: "therapist" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (roleErr) console.error("[admin] role grant failed", roleErr);

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "therapist_approved",
      target_type: "therapist_profile",
      target_id: profile.id,
    });

    const { sendTherapistApprovedEmail } = await import("@/lib/therapist-approval-email.server");
    await sendTherapistApprovedEmail(profile);

    return { ok: true };
  });

const rejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(3).max(1000),
});

type AdminAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status: string | null;
  price_cents: number | null;
  currency: string | null;
  service_name: string | null;
  client_email: string;
  client_name: string | null;
  therapist_id: string;
};

/** Therapists with their appointments, for the admin overview. */
export const listTherapistAppointmentsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: therapists, error: tErr } = await supabaseAdmin
      .from("therapist_profiles")
      .select("id, user_id, display_name, slug, published, location")
      .order("display_name", { ascending: true });
    if (tErr) {
      console.error("[admin] therapist list failed", tErr);
      throw new Error("We couldn't load therapists right now. Please try again.");
    }

    const { data: appts, error: aErr } = await supabaseAdmin
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, payment_status, price_cents, currency, service_name, client_email, client_name, therapist_id",
      )
      .order("starts_at", { ascending: false });
    if (aErr) {
      console.error("[admin] appointment list failed", aErr);
      throw new Error("We couldn't load appointments right now. Please try again.");
    }

    const emails: Record<string, string | null> = {};
    const rows = therapists ?? [];
    if (rows.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .in(
          "user_id",
          rows.map((r) => r.user_id),
        );
      for (const p of profiles ?? []) emails[p.user_id] = p.email;
    }

    const byTherapist = new Map<string, AdminAppointment[]>();
    for (const a of (appts ?? []) as AdminAppointment[]) {
      const list = byTherapist.get(a.therapist_id) ?? [];
      list.push(a);
      byTherapist.set(a.therapist_id, list);
    }

    type Bank = {
      account_name: string;
      account_number: string;
      sort_code: string;
      bank_name: string | null;
      bank_address: string | null;
    };
    const banks: Record<string, Bank> = {};
    if (rows.length) {
      const { data: bankRows } = await (supabaseAdmin as any)
        .from("therapist_bank_details")
        .select("user_id, account_name, account_number, sort_code, bank_name, bank_address")
        .in(
          "user_id",
          rows.map((r) => r.user_id),
        );
      for (const b of (bankRows ?? []) as (Bank & { user_id: string })[]) banks[b.user_id] = b;
    }

    return {
      therapists: rows.map((t) => ({
        id: t.id,
        display_name: t.display_name,
        slug: t.slug,
        published: t.published,
        location: t.location,
        email: emails[t.user_id] ?? null,
        appointments: byTherapist.get(t.id) ?? [],
        bank_details: banks[t.user_id] ?? null,
      })),
    };
  });

/** Clients (grouped by email) with their appointments, for the admin overview. */
export const listClientAppointmentsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appts, error } = await supabaseAdmin
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, payment_status, price_cents, currency, service_name, client_email, client_name, therapist_id",
      )
      .order("starts_at", { ascending: false });
    if (error) {
      console.error("[admin] client appointment list failed", error);
      throw new Error("We couldn't load clients right now. Please try again.");
    }

    const { data: therapists } = await supabaseAdmin
      .from("therapist_profiles")
      .select("id, display_name, user_id");
    const therapistNames = Object.fromEntries(
      (therapists ?? []).map((t) => [t.id, t.display_name as string]),
    );
    // Therapist/admin accounts are not patients — keep them off the Clients list.
    const { data: staffRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["therapist", "admin"]);
    const staffIds = new Set<string>([
      ...(therapists ?? []).map((t) => t.user_id as string),
      ...(staffRoles ?? []).map((r) => r.user_id as string),
    ]);

    const { data: links } = await supabaseAdmin
      .from("therapist_clients")
      .select("client_email, created_at");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, first_name, last_name, created_at");

    type Client = {
      email: string;
      name: string | null;
      joined_at: string | null;
      appointments: (AdminAppointment & { therapist_name: string | null })[];
    };
    const clients = new Map<string, Client>();
    const ensure = (email: string) => {
      const key = email.toLowerCase();
      let c = clients.get(key);
      if (!c) {
        c = { email: key, name: null, joined_at: null, appointments: [] };
        clients.set(key, c);
      }
      return c;
    };

    // Only accounts tagged as patients, or that have booked, count as clients.
    // Unfinished therapist sign-ups have no role and no bookings.
    const { data: clientRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "client");
    const clientIds = new Set((clientRoles ?? []).map((r) => r.user_id as string));
    const bookedEmails = new Set(
      ((appts ?? []) as AdminAppointment[]).map((a) => a.client_email.toLowerCase()),
    );
    for (const p of profiles ?? []) {
      if (!p.email || staffIds.has(p.user_id as string)) continue;
      if (!clientIds.has(p.user_id as string) && !bookedEmails.has(p.email.toLowerCase())) continue;
      const c = ensure(p.email);
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      if (name) c.name = name;
      c.joined_at = p.created_at ?? null;
    }
    for (const l of links ?? []) {
      if (l.client_email) ensure(l.client_email);
    }
    for (const a of (appts ?? []) as AdminAppointment[]) {
      const c = ensure(a.client_email);
      if (!c.name && a.client_name) c.name = a.client_name;
      c.appointments.push({ ...a, therapist_name: therapistNames[a.therapist_id] ?? null });
    }

    return {
      clients: Array.from(clients.values())
        .filter((c) => c.appointments.length > 0 || c.joined_at)
        .sort((a, b) => b.appointments.length - a.appointments.length),
    };
  });

export const rejectTherapistProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rejectSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("therapist_profiles")
      .update({
        published: false,
        approved_at: null,
        rejected_at: new Date().toISOString(),
        rejection_reason: data.reason,
      })
      .eq("id", data.id)
      .select("id")
      .single();
    if (error || !profile) {
      console.error("[admin] reject failed", error);
      throw new Error("We couldn't update this profile. Please try again.");
    }
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "therapist_rejected",
      target_type: "therapist_profile",
      target_id: profile.id,
      payload: { reason: data.reason },
    });
    return { ok: true };
  });

/** Live therapist status report (always current at the moment it's requested). */
export const getTherapistStatusReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { therapistStatus } = await import("@/lib/therapist-status");
    const db = supabaseAdmin as any;
    const [p, pr, c, s, b] = await Promise.all([
      db
        .from("therapist_profiles")
        .select(
          "id,user_id,slug,display_name,created_at,approved_at,rejected_at,published,years_in_practice",
        )
        .order("display_name"),
      db.from("profiles").select("user_id,email"),
      db.from("calcom_connections").select("therapist_id,connection_status"),
      db.from("therapist_services").select("therapist_id").eq("active", true),
      db.from("therapist_bank_details").select("user_id"),
    ]);
    if (p.error) throw new Error("We couldn't build the report right now. Please try again.");
    const email = new Map((pr.data ?? []).map((x: any) => [x.user_id, x.email]));
    const conn = new Map((c.data ?? []).map((x: any) => [x.therapist_id, x.connection_status]));
    const sess = new Map<string, number>();
    for (const x of s.data ?? []) sess.set(x.therapist_id, (sess.get(x.therapist_id) ?? 0) + 1);
    const bank = new Set((b.data ?? []).map((x: any) => x.user_id));
    const rows = (p.data ?? []).map((t: any) => {
      const cs = conn.get(t.id);
      const calcom = cs === "connected" ? "connected" : cs === "error" ? "error" : "none";
      const activeSessions = sess.get(t.id) ?? 0;
      return {
        name: t.display_name as string,
        email: (email.get(t.user_id) as string | undefined) ?? "",
        link: `https://veyrohealth.com/therapist/${t.slug}`,
        signedUp: String(t.created_at).slice(0, 10),
        approved: !!t.approved_at,
        rejected: !!t.rejected_at,
        published: !!t.published,
        calcom,
        activeSessions,
        bank: bank.has(t.user_id),
        years: t.years_in_practice as number | null,
        status: therapistStatus({
          rejected: !!t.rejected_at,
          approved: !!t.approved_at,
          published: !!t.published,
          calcom,
          activeSessions,
        }),
      };
    });
    return { generatedAt: new Date().toISOString(), rows };
  });
