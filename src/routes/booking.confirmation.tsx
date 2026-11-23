import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { finalizeMyPaidBooking, getBookingIntentStatus } from "@/lib/booking.functions";
import { PreSessionNoteBox } from "@/components/booking/PreSessionNoteBox";

export const Route = createFileRoute("/booking/confirmation")({
  validateSearch: (search: Record<string, unknown>): { intent?: string } => ({
    intent: typeof search.intent === "string" ? search.intent : undefined,
  }),
  component: BookingConfirmation,
  head: () => ({
    meta: [
      { title: "Booking confirmation — Veyro Health" },
      {
        name: "description",
        content: "Confirmation of your Veyro Health therapy session booking.",
      },
      { property: "og:title", content: "Booking confirmation — Veyro Health" },
      {
        property: "og:description",
        content: "Confirmation of your Veyro Health therapy session booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function BookingConfirmation() {
  const { intent } = Route.useSearch();
  const navigate = useNavigate();
  const finalizeBooking = useServerFn(finalizeMyPaidBooking);
  const getStatus = useServerFn(getBookingIntentStatus);
  const [state, setState] = useState<"waiting" | "confirmed" | "review" | "missing">(
    intent ? "waiting" : "missing",
  );
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);

  useEffect(() => {
    if (!intent) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    let attempts = 0;

    const checkBooking = async () => {
      attempts += 1;
      try {
        await finalizeBooking({ data: { bookingIntentId: intent } });
        const result = await getStatus({ data: { bookingIntentId: intent } });
        if (cancelled) return;
        if (result.status === "booked" && result.appointment?.id) {
          setAppointmentId(result.appointment.id);
          if ("isGuest" in result && result.isGuest) setManageToken(result.manageToken ?? null);
          setState("confirmed");
          window.sessionStorage.removeItem("veyro:bookingIntentId");
          return;
        }
      } catch {
        // The webhook may still be processing, so keep checking briefly.
      }

      if (!cancelled && attempts < 30) {
        timeoutId = window.setTimeout(checkBooking, 1000);
      } else if (!cancelled) {
        setState("review");
      }
    };

    void checkBooking();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [finalizeBooking, getStatus, intent]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16">
        <section className="w-full rounded-lg border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow-soft)] sm:px-10">
          {state === "waiting" && (
            <>
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
              <h1 className="mt-5 font-serif text-2xl">Confirming your appointment…</h1>
              <p className="mt-2 text-sm text-foreground/70">
                Payment received. This only takes a moment.
              </p>
            </>
          )}

          {state === "confirmed" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-5 font-serif text-2xl">Your session is confirmed</h1>
              <p className="mt-2 text-sm text-foreground/70">
                {manageToken
                  ? "We've emailed your confirmation, including a link to cancel or reschedule."
                  : "Payment was successful and your appointment is in Upcoming sessions."}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                {manageToken ? (
                  <Button asChild>
                    <Link to="/booking/manage/$token" params={{ token: manageToken }}>
                      Manage my booking
                    </Link>
                  </Button>
                ) : (
                  appointmentId && (
                    <Button asChild>
                      <Link to="/client/appointments/$id" params={{ id: appointmentId }}>
                        View appointment
                      </Link>
                    </Button>
                  )
                )}
                {!manageToken && (
                  <Button variant="outline" asChild>
                    <Link to="/client/dashboard">Go to dashboard</Link>
                  </Button>
                )}
              </div>
            </>
          )}

          {state === "review" && (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-5 font-serif text-2xl">Payment received</h1>
              <p className="mt-2 text-sm text-foreground/70">
                We&apos;re finalising your appointment. If your confirmation email does not arrive
                shortly, contact{" "}
                <a className="underline" href="mailto:join@veyrohealth.com">
                  join@veyrohealth.com
                </a>
                .
              </p>
              <Button className="mt-6" onClick={() => navigate({ to: "/client/dashboard" })}>
                Go to dashboard
              </Button>
            </>
          )}

          {state === "missing" && (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-5 font-serif text-2xl">Booking details not found</h1>
              <p className="mt-2 text-sm text-foreground/70">
                Open your dashboard to check your sessions.
              </p>
              <Button className="mt-6" asChild>
                <Link to="/client/dashboard">Go to dashboard</Link>
              </Button>
            </>
          )}
        </section>
        {state === "confirmed" && appointmentId && (
          <div className="w-full">
            <PreSessionNoteBox appointmentId={appointmentId} manageToken={manageToken} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
