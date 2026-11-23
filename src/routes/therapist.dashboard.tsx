import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cancelAppointmentAsTherapist } from "@/lib/therapist-appointments.functions";
import {
  Calendar,
  FileText,
  Settings,
  Users,
  Send,
  Lock,
  ExternalLink,
  Video,
  Trash2,
  Upload,
  Image as ImageIcon,
  Star,
} from "lucide-react";
import { TherapistPortalHeader } from "@/components/therapist/TherapistPortalHeader";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { CalcomAvailability } from "@/components/therapist/CalcomAvailability";
import { CalcomMeetingImport } from "@/components/therapist/CalcomMeetingImport";
import { CalcomAvailabilityGuide } from "@/components/therapist/CalcomAvailabilityGuide";
import { BankDetails } from "@/components/therapist/BankDetails";
import {
  getMyTherapistProfile,
  upsertMyTherapistProfile,
} from "@/lib/therapist-profiles.functions";
import {
  getTherapistDashboard,
  createSessionNote,
  addClientByEmail,
} from "@/lib/therapist-data.functions";
import { getMyRoles } from "@/lib/user-roles.functions";
import { getMyReviewsAsTherapist } from "@/lib/reviews.functions";

type DashData = Awaited<ReturnType<typeof getTherapistDashboard>>;

export const Route = createFileRoute("/therapist/dashboard")({
  component: TDash,
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Therapist portal — Veyro Health" },
      {
        name: "description",
        content: "Manage your Veyro therapist profile, appointments and therapy approach.",
      },
      { property: "og:title", content: "Therapist portal — Veyro Health" },
      {
        property: "og:description",
        content: "Manage your Veyro therapist profile, appointments and therapy approach.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Tab =
  | "overview"
  | "appointments"
  | "clients"
  | "availability"
  | "notes"
  | "reviews"
  | "settings"
  | "bank";
const TABS: Tab[] = [
  "overview",
  "appointments",
  "clients",
  "availability",
  "notes",
  "reviews",
  "settings",
  "bank",
];

function TDash() {
  const { tab: tabParam } = Route.useSearch();
  const [tab, setTab] = useState<Tab>(
    TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "overview",
  );
  const fetchDash = useServerFn(getTherapistDashboard);
  const [data, setData] = useState<DashData | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = async () => {
    try {
      const d = await fetchDash({});
      if (d?.therapist) setData(d);
    } catch (e) {
      console.error("[dashboard] refresh failed:", e);
    }
    setReloadKey((k) => k + 1);
  };
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: s }) => {
      if (cancelled) return;
      if (!s.session) {
        navigate({ to: "/therapist/signin", replace: true });
        return;
      }
      try {
        const { roles } = await getMyRoles();
        if (cancelled) return;
        // Therapists in progress may not yet have the therapist role (it is
        // granted on approval), but they DO have a therapist_profile row.
        // Only bounce true client-only accounts (no therapist role AND no
        // therapist profile) to the client area — otherwise we ping-pong
        // with client.dashboard, which redirects therapists back here.
        const d = await fetchDash({});
        if (cancelled) return;
        if (roles.includes("client") && !roles.includes("therapist") && !d?.therapist) {
          navigate({ to: "/client/dashboard", replace: true });
          return;
        }
        if (cancelled) return;
        // Therapist accounts without a profile are still therapists — keep
        // them in onboarding instead of falling through to the client area.
        if (!d?.therapist) {
          navigate({ to: "/therapist/onboarding", replace: true });
          return;
        }
        setData(d);
      } catch {
        if (!cancelled) navigate({ to: "/therapist/signin", replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchDash, reloadKey, navigate]);

  // Auto-refresh appointments every 60s so new bookings appear
  // without a manual refresh. Pauses while the tab is hidden.
  useEffect(() => {
    const tick = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const d = await fetchDash({});
        if (d?.therapist) setData(d);
      } catch (e) {
        console.error("[dashboard] auto-refresh failed:", e);
      }
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [fetchDash]);

  const displayName = data?.therapist?.display_name ?? "Therapist portal";

  // Access to the portal opens once the clinical team approves the profile.
  // (Going live publicly additionally needs a connected calendar, but the
  // portal itself must be reachable straight after approval.)
  if (data?.therapist && !data.therapist.approved_at && !data.therapist.published) {
    return <PendingApproval therapist={data.therapist} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TherapistPortalHeader />
      <main className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Practitioner portal
          </p>
          <h1 className="font-serif text-3xl text-foreground md:text-4xl">{displayName}</h1>
        </div>

        <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SideNav tab={tab} setTab={setTab} />
          <section>
            {tab === "overview" && <Overview onTab={setTab} data={data} onRefresh={reload} />}
            {tab === "appointments" && <Appointments data={data} onRefresh={reload} />}
            {tab === "clients" && <Clients data={data} onChanged={reload} />}
            {tab === "availability" && <MeetingSettingsTab onConnectedChange={reload} />}
            {tab === "notes" && <NotesPanel data={data} onChanged={reload} />}
            {tab === "reviews" && <ReviewsPanel />}
            {tab === "settings" && <ProfileSettings />}
            {tab === "bank" && <BankDetails />}
          </section>
        </div>
      </main>
    </div>
  );
}

function PendingApproval({
  therapist,
}: {
  therapist: {
    display_name: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
  };
}) {
  const rejected = Boolean(therapist.rejected_at);
  return (
    <div className="min-h-screen bg-background">
      <TherapistPortalHeader />
      <main className="mx-auto max-w-[720px] px-6 py-16">
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Lock className="h-5 w-5 text-foreground/70" />
          </div>
          <h1 className="mt-5 font-serif text-2xl text-foreground md:text-3xl">
            {rejected ? "We need a few changes" : "Your profile is with our clinical team"}
          </h1>
          {rejected ? (
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">
              Please contact{" "}
              <a
                href="mailto:join@veyrohealth.com"
                className="font-semibold text-foreground underline"
              >
                join@veyrohealth.com
              </a>
              .
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">
              Thanks for signing up
              {therapist.display_name ? `, ${therapist.display_name.split(" ")[0]}` : ""}. We're
              launching in a few weeks. Your portal — including availability, clients and session
              notes — unlocks as soon as your profile is approved, and we'll email you the moment it
              is.
            </p>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {rejected && (
              <Link
                to="/therapist/onboarding"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Update my profile details
              </Link>
            )}
            <Link
              to="/"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/40"
            >
              Back to Veyro
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

const NAV: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: "overview", label: "Overview", icon: Calendar },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "clients", label: "Clients", icon: Users },
  { id: "availability", label: "Meeting settings", icon: Calendar },
  { id: "notes", label: "Session notes", icon: FileText },
  { id: "reviews", label: "Reviews", icon: FileText },
  { id: "settings", label: "Profile", icon: Settings },
  { id: "bank", label: "Bank details", icon: Lock },
];

function SideNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <aside className="min-w-0 overflow-hidden rounded-3xl border border-border/60 bg-card p-3 shadow-[var(--shadow-soft)] lg:sticky lg:top-24 lg:h-fit">
      <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-medium transition lg:w-full lg:shrink ${tab === n.id ? "bg-secondary text-foreground" : "text-foreground/70 hover:bg-accent/40"}`}
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)] ${className}`}
    >
      {children}
    </div>
  );
}

function Overview({
  onTab,
  data,
  onRefresh,
}: {
  onTab: (t: Tab) => void;
  data: DashData | null;
  onRefresh: () => Promise<void> | void;
}) {
  const fetchProfile = useServerFn(getMyTherapistProfile);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const prevCountRef = useRef<number | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    prevCountRef.current = data?.upcoming?.length ?? 0;
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (prevCountRef.current === null) return;
    const now = data?.upcoming?.length ?? 0;
    const diff = now - prevCountRef.current;
    setRefreshMsg(
      diff > 0
        ? `Synced — ${diff} new booking${diff === 1 ? "" : "s"} added.`
        : "Up to date — no new bookings.",
    );
    prevCountRef.current = null;
    const t = setTimeout(() => setRefreshMsg(null), 4000);
    return () => clearTimeout(t);
  }, [data?.upcoming?.length]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        setLoaded(true);
        return;
      }
      fetchProfile({})
        .then(({ profile }) => {
          if (cancelled) return;
          setCalendarConnected(Boolean(profile?.calcom_connected_at));
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    });
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const clientsCount = data?.clients?.length ?? 0;
  const upcoming = data?.upcoming ?? [];
  const active = upcoming.filter((a) => a.status !== "cancelled");
  const upcomingCount = active.length;
  const next = active[0];
  const nextDate = next ? new Date(next.starts_at) : null;
  const nextDateStr = nextDate
    ? nextDate.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { l: "Upcoming sessions", v: String(upcomingCount) },
          { l: "Active clients", v: String(clientsCount) },
        ].map((s) => (
          <Card key={s.l}>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
              {s.l}
            </p>
            <p className="mt-2 font-serif text-3xl text-foreground">{s.v}</p>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-foreground">Next appointment</h2>
            <p className="mt-2 text-sm text-foreground/70">
              Your soonest confirmed booking. If something isn't showing, tap Refresh.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40 disabled:opacity-60"
            >
              {refreshing ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground/80" />
                  Syncing…
                </>
              ) : (
                "Refresh"
              )}
            </button>
            <Calendar className="h-6 w-6 shrink-0 text-primary" />
          </div>
        </div>
        {refreshMsg && <p className="mt-3 text-xs text-foreground/60">{refreshMsg}</p>}

        {next ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {next.client_name || next.client_email || "Client"}
              </p>
              <p className="text-xs text-foreground/60">{nextDateStr}</p>
            </div>
            {next.meeting_url && (
              <a
                href={next.meeting_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Join
              </a>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-foreground/60">No upcoming appointments yet.</p>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => onTab("appointments")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            View all appointments →
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => onTab("availability")}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/40"
          >
            {calendarConnected ? "Meeting settings" : "Connect your calendar"}
          </button>
        </div>
      </Card>
    </div>
  );
}

function Clients({ data, onChanged }: { data: DashData | null; onChanged: () => void }) {
  return <ClientsPanel data={data} onChanged={onChanged} />;
}

function Appointments({
  data,
  onRefresh,
}: {
  data: DashData | null;
  onRefresh: () => Promise<void> | void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const upcoming = data?.upcoming ?? [];
  const all = (data?.recentAppointments ?? []) as typeof upcoming;
  const now = Date.now();
  const past = all
    .filter((a) => a.status === "cancelled" || new Date(a.starts_at).getTime() < now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCancel(appointmentId: string) {
    if (
      !window.confirm(
        "Cancel this appointment? The client is refunded in full and both of you get an email.",
      )
    )
      return;
    setCancelling(appointmentId);
    try {
      const res = await cancelAppointmentAsTherapist({ data: { appointmentId } });
      if (res.ok) {
        toast.success("Appointment cancelled and the client refunded.");
        await onRefresh();
      } else {
        toast.error(res.error ?? "Could not cancel this appointment.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel this appointment.");
    } finally {
      setCancelling(null);
    }
  }

  const renderList = (items: typeof upcoming, emptyMsg: string) =>
    items.length > 0 ? (
      <ul className="mt-4 divide-y divide-border/60">
        {items.map((a) => {
          const start = new Date(a.starts_at);
          const dateStr = start.toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          const cancelled = a.status === "cancelled";
          return (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {a.client_name || a.client_email || "Client"}
                  {cancelled && (
                    <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                      Cancelled
                    </span>
                  )}
                </p>
                <p
                  className={
                    cancelled
                      ? "text-xs font-semibold text-destructive"
                      : "text-xs text-foreground/60"
                  }
                >
                  <span className={cancelled ? "line-through" : undefined}>{dateStr}</span>
                  {a.client_email ? ` · ${a.client_email}` : ""}
                </p>
                {a.client_note && (
                  <div className="mt-2 rounded-lg border border-border/60 bg-muted/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
                      Shared before the session
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">
                      {a.client_note}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {a.meeting_url && !cancelled && (
                  <a
                    href={a.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Join
                  </a>
                )}
                {!cancelled && start.getTime() > now && (
                  <>
                    {a.calcom_booking_uid && (
                      <a
                        href={`https://app.cal.com/booking/${a.calcom_booking_uid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Reschedule in Cal.com
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCancel(a.id)}
                      disabled={cancelling === a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                    >
                      {cancelling === a.id ? "Cancelling…" : "Cancel appointment (refund client)"}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="mt-4 text-sm text-foreground/60">{emptyMsg}</p>
    );

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-foreground">Appointments</h2>
            <p className="mt-2 text-sm text-foreground/70">
              All confirmed bookings taken through Veyro. Tap Refresh to pull the latest.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40 disabled:opacity-60"
          >
            {refreshing ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground/80" />
                Syncing…
              </>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </Card>
      <Card>
        <h3 className="font-serif text-lg text-foreground">Upcoming</h3>
        {renderList(upcoming, "No upcoming appointments.")}
      </Card>
      <Card>
        <h3 className="font-serif text-lg text-foreground">Past</h3>
        {renderList(past, "No past appointments yet.")}
      </Card>
    </div>
  );
}

function ClientsPanel({ data, onChanged }: { data: DashData | null; onChanged: () => void }) {
  const inviteClient = useServerFn(addClientByEmail);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clients = data?.clients ?? [];

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      const res = await inviteClient({
        data: { client_email: email.trim().toLowerCase() },
      });
      setEmail("");
      if (res.inviteSent) {
        setStatus("Invite sent. They'll appear here once they book their first appointment.");
      } else if (res.inviteSkippedReason === "already_has_account") {
        setStatus(
          "They already have a Veyro account — no invite sent. They'll appear here once they book an appointment with you.",
        );
      }
      onChanged();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-xl text-foreground">Invite a client</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Send someone a link to join Veyro. They'll only appear in your clients list after they
          book their first appointment with you on Veyro (you will pay no commission on any clients
          you have invited directly that have not been referred via the Veyro platform. Reviews for
          these clients will also be accepted).
        </p>
        <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Send invite
          </button>
        </form>
        {status && <p className="mt-3 text-xs text-foreground/70">{status}</p>}
      </Card>

      <Card>
        <h2 className="font-serif text-xl text-foreground">Your clients</h2>
        {clients.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/60">
            No clients yet. Clients appear here after they book their first appointment on Veyro.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {clients.map((c) => {
              const profileName = c.profile
                ? [c.profile.first_name, c.profile.last_name].filter(Boolean).join(" ")
                : "";
              const name = profileName || c.client_name || "";
              return (
                <li key={c.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-foreground">{name || c.client_email}</p>
                    <p className="text-xs text-foreground/60">{c.client_email}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${c.client_user_id ? "bg-primary/10 text-primary" : "bg-accent/60 text-foreground/70"}`}
                  >
                    {c.client_user_id ? "Account linked" : "Awaiting signup"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NotesPanel({ data, onChanged }: { data: DashData | null; onChanged: () => void }) {
  const saveNote = useServerFn(createSessionNote);
  const clients = data?.clients ?? [];
  const notes = data?.notes ?? [];
  const appointments = data?.recentAppointments ?? [];
  const [clientEmail, setClientEmail] = useState("");
  const [appointmentId, setAppointmentId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [shared, setShared] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Only show appointments for the selected client
  const clientAppointments = appointments.filter(
    (a) => (a.client_email ?? "").toLowerCase() === clientEmail.toLowerCase(),
  );

  async function handleSave(shareIt: boolean) {
    setStatus(null);
    if (!clientEmail || !appointmentId || !title.trim() || !body.trim()) {
      setStatus("Pick a client and session, then fill in the title and note.");
      return;
    }
    setSaving(true);
    try {
      const res = await saveNote({
        data: {
          client_email: clientEmail.trim().toLowerCase(),
          title: title.trim(),
          body: body.trim(),
          shared: shareIt,
          appointment_id: appointmentId || null,
        },
      });
      setTitle("");
      setBody("");
      setAppointmentId("");
      const msg = shareIt
        ? res.clientLinked
          ? "Note saved and shared — visible in the client's dashboard now."
          : "Note saved. They'll see it as soon as they create a Veyro account with this email."
        : "Note saved privately.";
      setStatus(msg);
      toast.success(msg);
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save note.";
      setStatus(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-foreground">New session note</h2>
          <span className="inline-flex items-center gap-1 text-xs text-foreground/60">
            <Lock className="h-3 w-3" /> Private by default
          </span>
        </div>
        <div className="mt-4 space-y-4">
          {clients.length === 0 ? (
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Client email (add them on the Clients tab first)"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60"
            />
          ) : (
            <select
              value={clientEmail}
              onChange={(e) => {
                setClientEmail(e.target.value);
                setAppointmentId("");
              }}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
            >
              <option value="">Choose a client…</option>
              {clients.map((c) => {
                const label = c.profile
                  ? [c.profile.first_name, c.profile.last_name].filter(Boolean).join(" ") ||
                    c.client_email
                  : c.client_email;
                return (
                  <option key={c.id} value={c.client_email ?? ""}>
                    {label}
                  </option>
                );
              })}
            </select>
          )}
          {clientEmail &&
            (clientAppointments.length > 0 ? (
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                required
              >
                <option value="">Choose a session…</option>
                {clientAppointments.map((a) => {
                  const d = new Date(a.starts_at).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const past = new Date(a.starts_at).getTime() < Date.now();
                  return (
                    <option key={a.id} value={a.id}>
                      {d}
                      {past ? " (past)" : ""}
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-background px-4 py-2.5 text-xs text-foreground/60">
                No sessions found for this client yet. Notes attach to a specific session, so this
                client needs a booking first.
              </p>
            ))}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Session 5 — homework)"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Write your session notes here…"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          <label className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Share this note securely with the client
          </label>
          {status && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs font-medium ${status.includes("saved") || status.includes("Saved") ? "border-green-500/30 bg-green-500/10 text-green-700" : "border-primary/30 bg-primary/10 text-foreground"}`}
            >
              {status}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              disabled={saving}
              onClick={() => handleSave(false)}
              className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/40 disabled:opacity-60"
            >
              Save as private
            </button>
            <button
              disabled={saving}
              onClick={() => handleSave(shared)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> {shared ? "Save & share" : "Save"}
            </button>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="font-serif text-xl text-foreground">Recent notes</h2>
        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/60">No notes yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {notes.map((n) => (
              <TherapistNoteRow key={n.id} note={n} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TherapistNoteRow({
  note,
}: {
  note: {
    id: string;
    title: string;
    body: string;
    client_email: string | null;
    created_at: string;
    shared: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-4 text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left transition hover:opacity-80"
      >
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{note.title}</p>
          <p className="text-xs text-foreground/60">
            {note.client_email ?? "—"} · {new Date(note.created_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${note.shared ? "bg-primary/10 text-primary" : "bg-accent/60 text-foreground/70"}`}
        >
          {note.shared ? "Shared" : "Private"}
        </span>
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-3">
          <p className="whitespace-pre-wrap text-sm text-foreground/80">{note.body}</p>
        </div>
      )}
    </li>
  );
}

function ProfileSettings() {
  return <ProfileSettingsInner />;
}

function ReviewsPanel() {
  const fetchReviews = useServerFn(getMyReviewsAsTherapist);
  const [data, setData] = useState<Awaited<ReturnType<typeof getMyReviewsAsTherapist>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchReviews({})
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => console.error("[reviews] load failed:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchReviews]);

  const topTraits = data
    ? Object.entries(data.traitCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-foreground">Your reviews</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Feedback from clients you've seen through Veyro.
            </p>
          </div>
          {data && data.count > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-foreground">
                <Star className="h-5 w-5 fill-current" />
                <span className="text-2xl font-semibold">{data.avg.toFixed(1)}</span>
              </div>
              <p className="text-xs text-foreground/60">
                {data.count} review{data.count === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>

        {topTraits.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {topTraits.map(([trait, n]) => (
              <span
                key={trait}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1 text-xs text-foreground/80"
              >
                {trait} <span className="text-foreground/50">· {n}</span>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card>
        {loading ? (
          <p className="text-sm text-foreground/60">Loading reviews…</p>
        ) : !data || data.count === 0 ? (
          <div className="text-sm text-foreground/70">
            <p>You don't have any reviews yet.</p>
            <p className="mt-1 text-foreground/60">
              Clients can leave a review after their first appointment from their Veyro dashboard.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < r.rating ? "fill-current text-foreground" : "text-foreground/25"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-foreground/60">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{r.body}</p>
                )}
                {r.traits && (r.traits as string[]).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(r.traits as string[]).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-accent/40 px-2.5 py-0.5 text-[11px] text-foreground/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ProfileSettingsInner() {
  const fetchProfile = useServerFn(getMyTherapistProfile);
  const saveProfile = useServerFn(upsertMyTherapistProfile);
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("Dr. Eva Kowalski");
  const [title, setTitle] = useState("Adult Psychotherapist");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");

  // Availability is managed on the Availability tab.
  // Publish status is admin-controlled (approval workflow); therapists cannot self-publish.
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [introVideoUrl, setIntroVideoUrl] = useState<string>("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoMsg, setVideoMsg] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [photoProgress, setPhotoProgress] = useState<number | null>(null);
  const [accountEmail, setAccountEmail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      setAccountEmail(data.session.user.email ?? "");
      fetchProfile({})
        .then(({ profile }) => {
          if (cancelled || !profile) return;
          setSlug(profile.slug ?? "");
          setDisplayName(profile.display_name ?? "");
          setTitle(profile.title ?? "");
          setBio(profile.bio ?? "");
          setGender((profile as { gender?: string | null }).gender ?? "");

          setIntroVideoUrl(profile.intro_video_url ?? "");
          setPhotoUrl(profile.photo_url ?? "");
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await saveProfile({
        data: {
          slug: slug.trim().toLowerCase(),
          display_name: displayName.trim(),
          title: title.trim() || null,
          bio: bio.trim() || null,
          photo_url: photoUrl.trim() || null,
          gender: (gender || null) as "male" | "female" | "other" | null,
        },
      });
      setStatus("Saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleVideoUpload(file: File) {
    setVideoMsg(null);
    if (!file.type.startsWith("video/")) {
      setVideoMsg("Please choose a video file.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setVideoMsg("Please keep the video under 100 MB.");
      return;
    }
    setVideoBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Please sign in.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${uid}/intro-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("therapist-videos")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      // Bucket is private; create a very long-lived signed URL for public viewing.
      const { data: signed, error: signErr } = await supabase.storage
        .from("therapist-videos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl)
        throw signErr ?? new Error("Could not generate video URL.");
      await saveProfile({
        data: {
          slug: slug.trim().toLowerCase(),
          display_name: displayName.trim(),
          intro_video_url: signed.signedUrl,
        },
      });
      setIntroVideoUrl(signed.signedUrl);
      setVideoMsg("Intro video uploaded and saved to your public profile.");
    } catch (err) {
      setVideoMsg(err instanceof Error ? err.message : "Failed to upload video.");
    } finally {
      setVideoBusy(false);
    }
  }

  async function handleRemoveVideo() {
    setVideoBusy(true);
    setVideoMsg(null);
    try {
      await saveProfile({
        data: {
          slug: slug.trim().toLowerCase(),
          display_name: displayName.trim(),
          intro_video_url: "",
        },
      });
      setIntroVideoUrl("");
      setVideoMsg("Video removed from your profile.");
    } catch (err) {
      setVideoMsg(err instanceof Error ? err.message : "Failed to remove video.");
    } finally {
      setVideoBusy(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    setPhotoMsg(null);
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setPhotoMsg("Please choose a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg("Please keep the photo under 5 MB.");
      return;
    }
    setPhotoBusy(true);
    setPhotoProgress(10);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Please sign in.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/photo-${Date.now()}.${ext}`;
      setPhotoProgress(40);
      const { error: upErr } = await supabase.storage
        .from("therapist-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      setPhotoProgress(70);
      const { data: signed, error: signErr } = await supabase.storage
        .from("therapist-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl)
        throw signErr ?? new Error("Could not generate photo URL.");
      await saveProfile({
        data: {
          slug: slug.trim().toLowerCase(),
          display_name: displayName.trim(),
          photo_url: signed.signedUrl,
        },
      });
      setPhotoUrl(signed.signedUrl);
      setPhotoProgress(100);
      setPhotoMsg("Profile photo updated.");
    } catch (err) {
      setPhotoMsg(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setPhotoBusy(false);
      setTimeout(() => setPhotoProgress(null), 800);
    }
  }

  async function handleRemovePhoto() {
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      await saveProfile({
        data: {
          slug: slug.trim().toLowerCase(),
          display_name: displayName.trim(),
          photo_url: "",
        },
      });
      setPhotoUrl("");
      setPhotoMsg("Photo removed from your profile.");
    } catch (err) {
      setPhotoMsg(err instanceof Error ? err.message : "Failed to remove photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <h2 className="font-serif text-xl text-foreground">Profile</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Your public profile. Edits will be re-reviewed before being shown to clients.
        </p>
        {accountEmail && (
          <div className="mt-4 rounded-xl border border-border/60 bg-accent/20 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Account email
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{accountEmail}</p>
          </div>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <LabelledInput
            label="Public URL slug"
            value={slug}
            onChange={setSlug}
            placeholder="dr-eva"
          />
          <LabelledInput
            label="Display name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Dr. Eva Kowalski"
          />
          <LabelledInput
            label="Therapy approach"
            value={title}
            onChange={setTitle}
            placeholder="Integrative therapy, CBT or person-centred therapy"
          />
        </div>
        <div className="mt-5">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Gender (optional)
          </span>
          <p className="mb-2 text-xs text-foreground/60">
            Some clients prefer to choose a therapist by gender.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
              { value: "other", label: "Other / prefer not to say" },
            ].map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGender((v) => (v === g.value ? "" : g.value))}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${gender === g.value ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-background text-foreground/80 hover:bg-accent/40"}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Bio
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
        </label>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-foreground">Profile photo</h2>
            <p className="mt-1 text-sm text-foreground/70">
              A clear, friendly headshot appears at the top of your public profile. Square images
              work best.
            </p>
          </div>
          <ImageIcon className="h-6 w-6 shrink-0 text-primary" />
        </div>

        {photoUrl ? (
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <img
              src={photoUrl}
              alt="Profile"
              className="h-28 w-28 rounded-full border border-border/60 object-cover"
            />
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/40">
                <Upload className="h-4 w-4" />
                {photoBusy ? "Uploading…" : "Replace photo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={photoBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                disabled={photoBusy}
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-primary/70" />
            <p className="mt-3 text-sm font-medium text-foreground">No profile photo yet</p>
            <p className="mt-1 text-xs text-foreground/60">PNG, JPG or WebP · up to 5 MB</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              {photoBusy ? "Uploading…" : "Upload photo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={photoBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoUpload(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        )}
        {photoProgress !== null && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${photoProgress}%` }}
            />
          </div>
        )}
        {photoMsg && <p className="mt-3 text-xs text-foreground/70">{photoMsg}</p>}
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-foreground">Introduction video</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Upload a short intro (60–90 seconds recommended). It appears prominently at the top of
              your public profile so prospective clients can get to know you before booking.
            </p>
          </div>
          <Video className="h-6 w-6 shrink-0 text-primary" />
        </div>

        {introVideoUrl ? (
          <div className="mt-5 space-y-3">
            <video
              src={introVideoUrl}
              controls
              preload="metadata"
              className="w-full max-w-2xl rounded-2xl border border-border/60 bg-black"
            />
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/40">
                <Upload className="h-4 w-4" />
                Replace video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  disabled={videoBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleVideoUpload(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                disabled={videoBusy}
                onClick={handleRemoveVideo}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center">
            <Video className="mx-auto h-8 w-8 text-primary/70" />
            <p className="mt-3 text-sm font-medium text-foreground">No intro video yet</p>
            <p className="mt-1 text-xs text-foreground/60">MP4, MOV or WebM · up to 100 MB</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              {videoBusy ? "Uploading…" : "Upload intro video"}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={videoBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleVideoUpload(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        )}
        {videoMsg && <p className="mt-3 text-xs text-foreground/70">{videoMsg}</p>}
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/70">{status}</p>
        <div className="flex gap-3">
          <Link
            to="/therapist/onboarding"
            className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/40"
          >
            Edit full profile
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60"
      />
    </label>
  );
}

function SInput({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5">
        <input defaultValue={value} className="w-full bg-transparent text-sm outline-none" />
        {suffix && <span className="text-xs font-semibold text-foreground/50">{suffix}</span>}
      </div>
    </label>
  );
}
function MeetingSettingsTab({ onConnectedChange }: { onConnectedChange?: () => void }) {
  const [version, setVersion] = useState(0);
  return (
    <div className="space-y-6">
      <CalcomAvailabilityGuide />
      <CalcomAvailability
        onConnectedChange={() => {
          setVersion((v) => v + 1);
          onConnectedChange?.();
        }}
      />
      <CalcomMeetingImport key={version} />
    </div>
  );
}
