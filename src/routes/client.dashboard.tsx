import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calendar, Video, Loader2, Star, Search, RefreshCw, FileText } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { getMyClientAppointments } from "@/lib/client-account.functions";
import { getMyTherapistProfile } from "@/lib/therapist-profiles.functions";
import { getMyRoles } from "@/lib/user-roles.functions";
import { getMyReviewableTherapists } from "@/lib/reviews.functions";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { CANCELLATION_POLICY_TEXT, CANCELLATION_WINDOW_HOURS } from "@/lib/cancellation-policy";

export const Route = createFileRoute("/client/dashboard")({
  component: ClientDashboard,
  head: () => ({
    meta: [
      { title: "Your patient dashboard — Veyro Health" },
      {
        name: "description",
        content: "Manage your Veyro appointments, session notes and therapist reviews.",
      },
      { property: "og:title", content: "Your patient dashboard — Veyro Health" },
      {
        property: "og:description",
        content: "Manage your Veyro appointments, session notes and therapist reviews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Appt = Awaited<ReturnType<typeof getMyClientAppointments>>["upcoming"][number];
type SharedNote = Awaited<ReturnType<typeof getMyClientAppointments>>["notes"][number];
type Reviewable = Awaited<ReturnType<typeof getMyReviewableTherapists>>;

function ClientDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcoming, setUpcoming] = useState<Appt[]>([]);
  const [past, setPast] = useState<Appt[]>([]);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [displayName, setDisplayName] = useState("");
  const [reviewable, setReviewable] = useState<Reviewable>({ therapists: [], reviews: [] });
  const [openReview, setOpenReview] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && reviewable.therapists.length && window.location.hash === "#leave-review") {
      document.getElementById("leave-review")?.scrollIntoView({ block: "start" });
    }
  }, [loading, reviewable.therapists.length]);

  const notesByAppt = new Map<string, SharedNote[]>();
  for (const n of notes) {
    if (!n.appointment_id) continue;
    const arr = notesByAppt.get(n.appointment_id) ?? [];
    arr.push(n);
    notesByAppt.set(n.appointment_id, arr);
  }

  async function refreshAppointments() {
    setRefreshing(true);
    try {
      const res = await getMyClientAppointments();
      setUpcoming(res.upcoming);
      setPast(res.past);
      setNotes(res.notes ?? []);
      setReviewed(new Set(res.reviewedTherapistIds));
      try {
        setReviewable(await getMyReviewableTherapists());
      } catch {
        /* ignore */
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        nav({
          to: "/client/signup",
          search: { redirect: window.location.pathname + window.location.hash },
        });
        return;
      }
      // Therapist accounts are separate — send therapists to their portal.
      try {
        const { roles } = await getMyRoles();
        if (roles.includes("therapist") && !roles.includes("client")) {
          const { profile } = await getMyTherapistProfile();
          nav({ to: profile ? "/therapist/dashboard" : "/therapist/onboarding" });
          return;
        }
      } catch {
        /* ignore and treat as client */
      }
      const u = data.session.user;
      setDisplayName(
        (u.user_metadata?.first_name as string) ||
          (u.user_metadata?.full_name as string) ||
          u.email ||
          "",
      );
      try {
        const res = await getMyClientAppointments();
        setUpcoming(res.upcoming);
        setPast(res.past);
        setNotes(res.notes ?? []);
        setReviewed(new Set(res.reviewedTherapistIds));
        try {
          setReviewable(await getMyReviewableTherapists());
        } catch {
          /* ignore */
        }
      } finally {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh appointments every 60s so new bookings appear
  // without a manual click. Skips while the tab is hidden.
  useEffect(() => {
    const tick = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await getMyClientAppointments();
        setUpcoming(res.upcoming);
        setPast(res.past);
        setNotes(res.notes ?? []);
        setReviewed(new Set(res.reviewedTherapistIds));
      } catch (e) {
        console.error("[client-dashboard] auto-refresh failed:", e);
      }
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Client dashboard
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground">
              Welcome{displayName ? `, ${displayName.split(" ")[0]}` : ""}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/therapists"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Search className="h-3.5 w-3.5" /> Find a therapist
            </Link>
            <button
              type="button"
              onClick={refreshAppointments}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:bg-accent/40 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Syncing…" : "Refresh appointments"}
            </button>
            <Link
              to="/client/reviews"
              className="text-sm font-semibold text-primary hover:underline"
            >
              My reviews →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
          </div>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/60">
                Upcoming
              </h2>
              <p className="mb-3 text-xs text-foreground/60">
                {CANCELLATION_POLICY_TEXT} Open a session to cancel it.
              </p>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-5 w-5" />}
                  title="No upcoming sessions"
                  cta={{ to: "/therapists", label: "Find a therapist" }}
                />
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appt={a}
                      reviewed={reviewed.has(a.therapist_id)}
                      notes={notesByAppt.get(a.id) ?? []}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/60">
                Past sessions
              </h2>
              {past.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-sm text-foreground/60">
                  No past sessions yet. Once you complete a session, you'll be able to leave a
                  review.
                </div>
              ) : (
                <ul className="space-y-3">
                  {past.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appt={a}
                      reviewed={reviewed.has(a.therapist_id)}
                      notes={notesByAppt.get(a.id) ?? []}
                    />
                  ))}
                </ul>
              )}
            </section>

            {reviewable.therapists.length > 0 && (
              <section id="leave-review" className="mt-10 scroll-mt-24">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/60">
                  Leave a review
                </h2>
                <p className="mb-4 text-xs text-foreground/60">
                  Share feedback with therapists you've booked. Your name is not shown publicly.
                </p>
                <ul className="space-y-3">
                  {reviewable.therapists.map((tp) => {
                    const existing =
                      reviewable.reviews.find((r) => r.therapist_id === tp.id) ?? null;
                    const isOpen = openReview === tp.id;
                    return (
                      <li key={tp.id} className="rounded-2xl border border-border/60 bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {tp.photo_url ? (
                              <img
                                src={tp.photo_url}
                                alt={tp.display_name}
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-full bg-primary/10 text-center text-sm font-semibold leading-[44px] text-primary">
                                {tp.display_name
                                  ?.split(" ")
                                  .map((w) => w[0])
                                  .slice(0, 2)
                                  .join("") ?? "?"}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {tp.display_name}
                              </p>
                              {existing && (
                                <div className="mt-0.5 flex gap-0.5">
                                  {Array.from({ length: existing.rating }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className="h-3 w-3 fill-amber-500 text-amber-500"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenReview(isOpen ? null : tp.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
                          >
                            <Star className="h-3.5 w-3.5" />{" "}
                            {isOpen ? "Close" : existing ? "Edit review" : "Leave review"}
                          </button>
                        </div>
                        {isOpen && (
                          <div className="mt-4 border-t border-border/60 pt-4">
                            <ReviewForm
                              therapistId={tp.id}
                              therapistName={tp.display_name}
                              existing={existing}
                              compact
                              onSaved={async () => {
                                setOpenReview(null);
                                await refreshAppointments();
                              }}
                              onDeleted={async () => {
                                setOpenReview(null);
                                await refreshAppointments();
                              }}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function NoteCard({ note }: { note: SharedNote }) {
  const [expanded, setExpanded] = useState(false);
  const created = new Date(note.created_at);
  const long = note.body.length > 280;
  const shown = expanded || !long ? note.body : note.body.slice(0, 280) + "…";
  return (
    <li
      className="cursor-pointer rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-accent/30"
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
      <div className="flex items-start gap-3">
        {note.therapist?.photo_url ? (
          <img
            src={note.therapist.photo_url}
            alt={note.therapist.display_name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{note.title}</p>
            <p className="text-xs text-foreground/60">
              {note.therapist?.display_name ?? "Therapist"} ·{" "}
              {created.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{shown}</p>
          {long && (
            <p className="mt-2 text-xs font-semibold text-primary">
              {expanded ? "Show less" : "Read more"}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function AppointmentCard({
  appt,
  reviewed,
  notes,
}: {
  appt: Appt;
  reviewed: boolean;
  notes: SharedNote[];
}) {
  const start = new Date(appt.starts_at);
  const past = start.getTime() < Date.now();
  const canJoin = !past && start.getTime() - Date.now() < 15 * 60 * 1000;
  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {appt.therapist?.photo_url ? (
            <img
              src={appt.therapist.photo_url}
              alt={appt.therapist.display_name}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-primary/10 text-center text-sm font-semibold leading-[44px] text-primary">
              {appt.therapist?.display_name
                ?.split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("") ?? "?"}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {appt.therapist?.display_name ?? "Therapist"}
              {appt.status === "cancelled" && (
                <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                  Cancelled
                </span>
              )}
            </p>
            <p
              className={
                appt.status === "cancelled"
                  ? "text-xs font-semibold text-destructive line-through"
                  : "text-xs text-foreground/60"
              }
            >
              {start.toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canJoin && appt.meeting_url && (
            <a
              href={appt.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Video className="h-3.5 w-3.5" /> Join
            </a>
          )}
          <Link
            to="/client/appointments/$id"
            params={{ id: appt.id }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:border-primary/40"
          >
            Details
          </Link>
          {!past &&
            appt.status !== "cancelled" &&
            (start.getTime() - Date.now()) / 3_600_000 >= CANCELLATION_WINDOW_HOURS && (
              <>
                <Link
                  to="/client/appointments/$id"
                  params={{ id: appt.id }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:border-primary/40"
                >
                  Reschedule
                </Link>
                <Link
                  to="/client/appointments/$id"
                  params={{ id: appt.id }}
                  className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  Cancel
                </Link>
              </>
            )}
          {!past &&
            appt.status !== "cancelled" &&
            (start.getTime() - Date.now()) / 3_600_000 < CANCELLATION_WINDOW_HOURS && (
              <span className="text-[11px] text-muted-foreground">
                Within {CANCELLATION_WINDOW_HOURS}h — contact your therapist to change
              </span>
            )}
          {past && !reviewed && (
            <Link
              to="/client/appointments/$id"
              params={{ id: appt.id }}
              className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              <Star className="h-3.5 w-3.5" /> Leave review
            </Link>
          )}
          {past && reviewed && <span className="text-xs text-foreground/50">Review submitted</span>}
        </div>
      </div>
      {appt.client_note && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/60">
            <FileText className="h-3.5 w-3.5" /> What you shared with your therapist
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground/80">{appt.client_note}</p>
        </div>
      )}
      {notes.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/60">
            <FileText className="h-3.5 w-3.5" /> Notes from your therapist
          </p>
          <ul className="space-y-2">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function EmptyState({
  icon,
  title,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-10 text-center">
      <div className="text-foreground/50">{icon}</div>
      <p className="text-sm text-foreground/70">{title}</p>
      <Link
        to={cta.to}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
      >
        <Search className="h-3.5 w-3.5" /> {cta.label}
      </Link>
    </div>
  );
}
