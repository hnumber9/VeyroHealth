import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  Calendar,
  Download,
  FileText,
  Loader2,
  Mail,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { getMyClientAppointment } from "@/lib/client-account.functions";
import { cancelMyAppointment } from "@/lib/client-cancellation.functions";
import { CANCELLATION_WINDOW_HOURS } from "@/lib/cancellation-policy";
import { getMyRescheduleSlots, rescheduleMyAppointment } from "@/lib/client-reschedule.functions";
import { sendBookingConfirmation } from "@/lib/booking-confirmation-email.functions";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { SlotDayTimePicker } from "@/components/booking/SlotDayTimePicker";
import { PreSessionNoteBox } from "@/components/booking/PreSessionNoteBox";

export const Route = createFileRoute("/client/appointments/$id")({
  component: AppointmentDetail,
  head: () => ({ meta: [{ title: "Session — Veyro Health" }] }),
});

type Data = Awaited<ReturnType<typeof getMyClientAppointment>>;

function AppointmentDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data | null>(null);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [rescheduleMsg, setRescheduleMsg] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: s }) => {
      if (!s.session) {
        nav({ to: "/client/signup" });
        return;
      }
      try {
        setData(await getMyClientAppointment({ data: { id } }));
      } finally {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function reload() {
    setData(await getMyClientAppointment({ data: { id } }));
  }

  async function handleSendConfirmation() {
    setSending(true);
    try {
      const res = await sendBookingConfirmation({ data: { appointmentId: id } });
      if (res.success) {
        toast.success("Confirmation email sent.");
      } else {
        toast.error(res.error ?? "Could not send confirmation email.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send confirmation email.");
    } finally {
      setSending(false);
    }
  }

  const appt = data?.appointment;
  const therapist = data?.therapist;
  const past = appt ? new Date(appt.starts_at).getTime() < Date.now() : false;
  const cancelled = appt?.status === "cancelled";
  const hoursUntil = appt ? (new Date(appt.starts_at).getTime() - Date.now()) / 3_600_000 : 0;
  const canCancel = Boolean(appt) && !cancelled && hoursUntil >= CANCELLATION_WINDOW_HOURS;

  async function openReschedule() {
    setRescheduleOpen(true);
    setSlots(null);
    setSlotsError(null);
    try {
      const from = new Date().toISOString().slice(0, 10);
      const to = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const res = await getMyRescheduleSlots({ data: { appointmentId: id, from, to } });
      if (res.slots.length === 0) {
        setSlotsError("No open times in the next 30 days. Please contact your therapist.");
      }
      setSlots(res.slots);
    } catch {
      setSlotsError("Could not load available times.");
      setSlots([]);
    }
  }

  async function handleReschedule(slotStart: string) {
    setMoving(slotStart);
    setRescheduleError(null);
    try {
      const res = await rescheduleMyAppointment({ data: { appointmentId: id, slotStart } });
      if (res.ok) {
        const msg = `Session moved to ${new Date(slotStart).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })} — we've emailed the new time. No extra payment needed.`;
        setRescheduleMsg(msg);
        toast.success(msg);
        setRescheduleOpen(false);
        await reload();
      } else {
        setRescheduleError(res.error ?? "Could not move this session.");
        toast.error(res.error ?? "Could not move this session.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not move this session.";
      setRescheduleError(msg);
      toast.error(msg);
    } finally {
      setMoving(null);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this session? You'll be refunded in full.")) return;
    setCancelling(true);
    try {
      const res = await cancelMyAppointment({ data: { appointmentId: id } });
      if (res.ok) {
        const msg = res.refunded
          ? "Session cancelled — your refund is on its way."
          : "Session cancelled. We'll process your refund shortly.";
        setCancelDone(msg);
        toast.success(msg);
        await reload();
      } else {
        toast.error(res.error ?? "Could not cancel this session.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel this session.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[720px] px-6 py-10">
        <Link
          to="/client/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
          </div>
        ) : !appt ? (
          <p className="text-sm text-foreground/70">Session not found.</p>
        ) : (
          <>
            {cancelDone && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Session cancelled</p>
                  <p className="mt-0.5 text-sm text-foreground/70">{cancelDone}</p>
                </div>
              </div>
            )}
            {rescheduleMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Session rescheduled</p>
                  <p className="mt-0.5 text-sm text-foreground/70">{rescheduleMsg}</p>
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <div className="flex items-start gap-4">
                {therapist?.photo_url ? (
                  <img
                    src={therapist.photo_url}
                    alt={therapist.display_name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 text-center text-lg font-semibold leading-[56px] text-primary">
                    {therapist?.display_name
                      ?.split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("") ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="font-serif text-2xl text-foreground">
                    {therapist?.display_name ?? "Therapist"}
                  </h1>
                  {therapist?.title && (
                    <p className="text-sm text-foreground/60">{therapist.title}</p>
                  )}
                  <p className="mt-2 flex items-center gap-2 text-sm text-foreground/75">
                    <Calendar className="h-4 w-4 text-primary" />
                    {new Date(appt.starts_at).toLocaleString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-foreground/60">Status: {appt.status}</p>
                </div>
              </div>
              {appt.meeting_url && !past && !cancelled && (
                <a
                  href={appt.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Video className="h-4 w-4" /> Join session
                </a>
              )}
              {!past && !cancelled && (
                <button
                  type="button"
                  onClick={handleSendConfirmation}
                  disabled={sending}
                  className="mt-3 ml-0 inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60 sm:ml-2"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Resend confirmation email
                </button>
              )}
              {!past && !cancelled && (
                <div className="mt-5">
                  <PreSessionNoteBox appointmentId={id} />
                </div>
              )}
              {!past && !cancelled && (
                <div className="mt-5 rounded-xl border border-border/60 bg-muted/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Cancellation &amp; refund
                    policy
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    You can cancel anytime up to {CANCELLATION_WINDOW_HOURS} hours before your
                    session starts and you'll be refunded in full. Within{" "}
                    {CANCELLATION_WINDOW_HOURS} hours of the start time, the session is no longer
                    refundable.
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    Rescheduling is free. Your new time replaces the original session and uses the
                    payment you've already made, so you won't be charged again.
                  </p>
                  {canCancel ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openReschedule}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                      >
                        <CalendarClock className="h-4 w-4" /> Reschedule session
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {cancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Cancel session &amp; refund
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-foreground/60">
                      This session starts in less than {CANCELLATION_WINDOW_HOURS} hours, so it can
                      no longer be cancelled online — please contact your therapist directly.
                    </p>
                  )}
                  {rescheduleOpen && canCancel && (
                    <div className="mt-4 rounded-xl border border-border/60 bg-background p-4">
                      <p className="text-sm font-semibold text-foreground">Pick a new time</p>
                      <p className="mt-1 text-xs text-foreground/60">
                        You've already paid — moving your session doesn't cost anything extra.
                      </p>
                      {slots === null ? (
                        <div className="flex py-6 justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
                        </div>
                      ) : slotsError ? (
                        <p className="mt-3 text-sm text-foreground/70">{slotsError}</p>
                      ) : (
                        <SlotDayTimePicker
                          slots={slots}
                          moving={moving}
                          onPick={handleReschedule}
                        />
                      )}
                      {rescheduleError && (
                        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                          {rescheduleError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {therapist && (
                <Link
                  to="/therapist/$slug"
                  params={{ slug: therapist.slug }}
                  className="mt-4 block text-xs text-primary hover:underline"
                >
                  View therapist profile →
                </Link>
              )}
            </div>

            {past && therapist && (
              <div className="mt-8">
                <ReviewForm
                  therapistId={appt.therapist_id}
                  therapistName={therapist.display_name}
                  existing={data?.myReview ?? null}
                  onSaved={reload}
                  onDeleted={reload}
                />
              </div>
            )}

            {data?.notes && data.notes.length > 0 && (
              <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6">
                <h2 className="flex items-center gap-2 font-serif text-xl text-foreground">
                  <FileText className="h-5 w-5 text-primary" /> Session notes
                </h2>
                <p className="mt-1 text-xs text-foreground/60">
                  Shared by your therapist for this session.
                </p>
                <ul className="mt-4 space-y-4">
                  {data.notes.map((n) => (
                    <li key={n.id} className="rounded-xl border border-border/60 bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-foreground/60">
                            {new Date(n.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            downloadNote(n.title, n.body, therapist?.display_name ?? "therapist")
                          }
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-accent/40"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">
                        {n.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function downloadNote(title: string, body: string, therapistName: string) {
  const content = `${title}\nFrom: ${therapistName}\n\n${body}\n`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "session-note"}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
