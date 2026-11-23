import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CalendarDays, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PreSessionNoteBox } from "@/components/booking/PreSessionNoteBox";
import { SlotDayTimePicker } from "@/components/booking/SlotDayTimePicker";
import { CANCELLATION_POLICY_TEXT, CANCELLATION_WINDOW_HOURS } from "@/lib/cancellation-policy";
import {
  cancelByToken,
  getBookingByToken,
  rescheduleByToken,
  rescheduleSlotsByToken,
} from "@/lib/manage-booking.functions";

export const Route = createFileRoute("/booking/manage/$token")({
  component: ManageBooking,
  head: () => ({
    meta: [
      { title: "Manage my booking — Veyro Health" },
      {
        name: "description",
        content: "Cancel, reschedule or add a note to your Veyro Health session.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Manage my booking — Veyro Health" },
      {
        property: "og:description",
        content: "Cancel, reschedule or add a note to your Veyro Health session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Booking = NonNullable<Awaited<ReturnType<typeof getBookingByToken>>["booking"]>;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

function ManageBooking() {
  const { token } = Route.useParams();
  const load = useServerFn(getBookingByToken);
  const cancel = useServerFn(cancelByToken);
  const loadSlots = useServerFn(rescheduleSlotsByToken);
  const reschedule = useServerFn(rescheduleByToken);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await load({ data: { token } }).catch(() => ({ booking: null }));
    if (res.booking) {
      setBooking(res.booking);
      setState("ready");
    } else setState("invalid");
  }, [load, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hoursUntil = booking ? (new Date(booking.startsAt).getTime() - Date.now()) / 3_600_000 : 0;
  const canChange = booking?.status !== "cancelled" && hoursUntil >= CANCELLATION_WINDOW_HOURS;

  async function handleCancel() {
    if (!window.confirm("Cancel this session? You'll get a full refund.")) return;
    setBusy(true);
    setError(null);
    const res = await cancel({ data: { token } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setMessage(
      res.refunded
        ? "Your session is cancelled and your refund is on its way."
        : "Your session is cancelled.",
    );
    setSlots(null);
    await refresh();
  }

  async function openReschedule() {
    setError(null);
    setSlots([]);
    const from = new Date();
    const to = new Date(from.getTime() + 42 * 86_400_000);
    const res = await loadSlots({
      data: { token, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    });
    setSlots(res.slots);
    if (!res.slots.length) setError("No other times are available right now.");
  }

  async function pick(slotStart: string) {
    setMoving(slotStart);
    setError(null);
    const res = await reschedule({ data: { token, slotStart } });
    setMoving(null);
    if (!res.ok) return setError(res.error);
    setMessage(`Moved to ${fmt(res.startsAt)}. We've emailed you the new details.`);
    setSlots(null);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-14">
        {state === "loading" && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />}

        {state === "invalid" && (
          <section className="rounded-2xl border border-border bg-card p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 font-serif text-2xl">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-foreground/70">
              It may have expired. Email{" "}
              <a className="underline" href="mailto:support@veyrohealth.com">
                support@veyrohealth.com
              </a>{" "}
              and we&apos;ll help.
            </p>
          </section>
        )}

        {state === "ready" && booking && (
          <>
            <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <p className="text-xs uppercase tracking-wider text-foreground/60">Your booking</p>
              <h1 className="mt-1 font-serif text-2xl">
                {booking.serviceName ?? "Session"} with {booking.therapistName}
              </h1>
              <p
                className={`mt-3 flex items-center gap-2 text-sm ${
                  booking.status === "cancelled"
                    ? "text-destructive line-through"
                    : "text-foreground/80"
                }`}
              >
                <CalendarDays className="h-4 w-4" /> {fmt(booking.startsAt)} (UK time)
              </p>
              {booking.status === "cancelled" && (
                <p className="mt-1 text-sm font-medium text-destructive">Cancelled</p>
              )}
              {booking.meetingUrl && booking.status !== "cancelled" && (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-primary underline"
                >
                  <Video className="h-4 w-4" /> Join session
                </a>
              )}

              {message && <p className="mt-4 text-sm text-primary">{message}</p>}
              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

              {booking.status !== "cancelled" && (
                <div className="mt-5 border-t border-border/60 pt-4">
                  {canChange ? (
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={openReschedule} disabled={busy}>
                        Reschedule
                      </Button>
                      <Button variant="destructive" onClick={handleCancel} disabled={busy}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cancel session
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/70">
                      This session is less than {CANCELLATION_WINDOW_HOURS} hours away, so it can no
                      longer be changed online. Please contact your therapist directly.
                    </p>
                  )}
                  <p className="mt-3 text-xs text-foreground/60">{CANCELLATION_POLICY_TEXT}</p>
                </div>
              )}

              {slots && slots.length > 0 && (
                <div className="mt-5">
                  <SlotDayTimePicker slots={slots} moving={moving} onPick={pick} />
                </div>
              )}
            </section>

            {booking.status !== "cancelled" && (
              <PreSessionNoteBox appointmentId={token} manageToken={token} />
            )}

            <p className="text-center text-sm text-foreground/70">
              Want all your sessions in one place?{" "}
              <Link to="/client/signup" className="underline">
                Create a free account
              </Link>{" "}
              with the same email.
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
