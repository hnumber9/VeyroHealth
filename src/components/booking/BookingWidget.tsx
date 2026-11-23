import { useCallback, useEffect, useMemo, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, isPaymentsConfigured } from "@/lib/stripe";
import { listPublicServices } from "@/lib/therapist-services.functions";
import {
  abandonBooking,
  finalizeMyPaidBooking,
  getBookingIntentStatus,
  getServiceAvailability,
  startBooking,
} from "@/lib/booking.functions";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
};

type Step = "service" | "slot" | "pay" | "done";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function BookingWidget({
  therapistId,
  therapistName,
  clientName,
  clientEmail,
  signedIn = false,
}: {
  therapistId: string;
  therapistName: string;
  clientName?: string | null;
  clientEmail?: string | null;
  signedIn?: boolean;
}) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingIntentId, setBookingIntentId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<"waiting" | "confirmed" | "review">("waiting");
  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPublicServices({ data: { therapistId } })
      .then((res) => {
        if (!cancelled) setServices(res.services as Service[]);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [therapistId]);

  const loadSlots = useCallback(
    async (selected: Service) => {
      setLoadingSlots(true);
      setError(null);
      const from = new Date();
      const to = new Date(from.getTime() + 28 * 24 * 60 * 60 * 1000);
      try {
        const res = await getServiceAvailability({
          data: {
            therapistId,
            serviceId: selected.id,
            from: from.toISOString().slice(0, 10),
            to: to.toISOString().slice(0, 10),
            nonce: Date.now().toString(36),
          },
        });
        setSlots(res.slots);
        if (res.slots.length === 0) {
          setError(
            res.reason === "no_calendar"
              ? "This therapist hasn't connected their calendar yet."
              : "No times available in the next four weeks. Please check back soon.",
          );
        }
      } catch {
        setError("We couldn't load availability. Please try again.");
      } finally {
        setLoadingSlots(false);
      }
    },
    [therapistId],
  );

  const chooseService = (selected: Service) => {
    setService(selected);
    setSlot(null);
    setStep("slot");
    void loadSlots(selected);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of slots) {
      const key = dayKey(iso);
      map.set(key, [...(map.get(key) ?? []), iso]);
    }
    return Array.from(map.entries());
  }, [slots]);

  const beginPayment = async () => {
    if (!service || !slot) return;
    setError(null);
    let name = clientName?.trim() || "Veyro client";
    let email: string | undefined = clientEmail ?? undefined;
    if (!signedIn) {
      name = guestName.trim();
      email = guestEmail.trim().toLowerCase();
      if (!name) return setError("Please enter your name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return setError("Please enter a valid email address.");
      if (createAccount && password.length < 8) {
        return setError("Your password needs at least 8 characters.");
      }
    }
    setSubmitting(true);
    try {
      if (!signedIn && createAccount) {
        const [first, ...rest] = name.split(/\s+/);
        const { error: signUpError } = await supabase.auth.signUp({
          email: email!,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/client/dashboard`,
            data: { first_name: first, last_name: rest.join(" ") || null, full_name: name },
          },
        });
        if (signUpError && !/already/i.test(signUpError.message)) {
          setError(signUpError.message);
          return;
        }
        // Existing account or email confirmation pending: carry on with the
        // booking by email — it links to the account once they sign in.
      }
      const res = await startBooking({
        data: {
          therapistId,
          serviceId: service.id,
          slotStart: slot,
          clientName: name,
          clientEmail: email,
          returnUrl: `${window.location.origin}/booking/confirmation`,
        },
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (!("clientSecret" in res) || !res.clientSecret) {
        setError("We couldn't start checkout. Please try again.");
        return;
      }
      setClientSecret(res.clientSecret);
      setBookingIntentId(res.bookingIntentId);
      setHoldExpiresAt(res.holdExpiresAt);
      setStep("pay");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPayment = async () => {
    if (bookingIntentId) {
      await abandonBooking({ data: { bookingIntentId } }).catch(() => undefined);
    }
    setClientSecret(null);
    setBookingIntentId(null);
    setHoldExpiresAt(null);
    setStep("slot");
    if (service) void loadSlots(service);
  };

  // Stripe returns the client to ?booking=complete; poll until the webhook
  // has turned the paid intent into a real appointment.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking") !== "complete") return;
    const stored = params.get("intent") ?? window.sessionStorage.getItem("veyro:bookingIntentId");
    if (!stored) return;
    setStep("done");

    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        if (attempts > 1) {
          await finalizeMyPaidBooking({ data: { bookingIntentId: stored } });
        }
        const res = await getBookingIntentStatus({ data: { bookingIntentId: stored } });
        if (res.status === "booked" && res.appointment?.id) {
          setConfirmedAppointmentId(res.appointment.id);
          if ("isGuest" in res && res.isGuest) setManageToken(res.manageToken ?? null);
          setConfirmState("confirmed");
          window.sessionStorage.removeItem("veyro:bookingIntentId");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (attempts < 20) window.setTimeout(tick, 2000);
      else setConfirmState("review");
    };
    void tick();
  }, []);

  useEffect(() => {
    if (bookingIntentId) window.sessionStorage.setItem("veyro:bookingIntentId", bookingIntentId);
  }, [bookingIntentId]);

  // Stripe's embedded checkout redirect can be swallowed when the widget sits
  // inside a dialog/iframe, so poll the intent while the payment form is open
  // and drive the confirmation page ourselves as soon as payment lands.
  useEffect(() => {
    if (step !== "pay" || !bookingIntentId) return;
    let cancelled = false;
    const goToConfirmation = () => {
      window.location.assign(
        `/booking/confirmation?booking=complete&intent=${encodeURIComponent(bookingIntentId)}`,
      );
    };
    const tick = async () => {
      try {
        const res = await getBookingIntentStatus({ data: { bookingIntentId } });
        if (cancelled) return;
        if (["paid", "paid_needs_review", "booked"].includes(res.status)) {
          goToConfirmation();
          return;
        }
      } catch {
        /* keep polling */
      }
      if (!cancelled) timeoutId = window.setTimeout(tick, 3000);
    };
    let timeoutId = window.setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [step, bookingIntentId]);

  if (!isPaymentsConfigured()) {
    return (
      <Shell>
        <p className="font-serif text-lg text-foreground">Booking coming soon</p>
        <p className="mt-2 text-sm text-foreground/70">
          Online payments aren&apos;t switched on yet. Please check back shortly.
        </p>
      </Shell>
    );
  }

  if (step === "done") {
    return (
      <Shell>
        {confirmState === "waiting" && (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-4 font-serif text-lg text-foreground">Confirming your appointment…</p>
            <p className="mt-2 text-sm text-foreground/70">This only takes a moment.</p>
          </>
        )}
        {confirmState === "confirmed" && (
          <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-4 font-serif text-lg text-foreground">
              Payment received, meeting now confirmed
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              {manageToken
                ? "We've emailed your confirmation with a link to manage your booking."
                : "It has been added to Upcoming sessions in your dashboard."}
            </p>
            {manageToken ? (
              <Button asChild className="mt-5">
                <Link to="/booking/manage/$token" params={{ token: manageToken }}>
                  Manage my booking
                </Link>
              </Button>
            ) : (
              confirmedAppointmentId && (
                <Button asChild className="mt-5">
                  <Link to="/client/appointments/$id" params={{ id: confirmedAppointmentId }}>
                    Go to meeting details
                  </Link>
                </Button>
              )
            )}
          </>
        )}
        {confirmState === "review" && (
          <>
            <AlertCircle className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-4 font-serif text-lg text-foreground">Payment received</p>
            <p className="mt-2 text-sm text-foreground/70">
              We&apos;re finalising your appointment. If you don&apos;t get a confirmation email
              shortly, email{" "}
              <a className="underline" href="mailto:join@veyrohealth.com">
                join@veyrohealth.com
              </a>{" "}
              and we&apos;ll sort it straight away.
            </p>
          </>
        )}
      </Shell>
    );
  }

  if (step === "pay" && clientSecret) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {service?.name} with {therapistName}
            </p>
            <p className="text-xs text-foreground/60">
              {slot ? `${dayKey(slot)} at ${timeLabel(slot)}` : ""}
              {service ? ` · ${formatPrice(service.price_cents, service.currency)}` : ""}
            </p>
          </div>
          <HoldCountdown expiresAt={holdExpiresAt} onExpired={cancelPayment} />
        </div>
        <EmbeddedCheckoutProvider
          stripe={getStripe()}
          options={{
            clientSecret,
            onComplete: () => {
              if (!bookingIntentId) return;
              window.location.assign(
                `/booking/confirmation?booking=complete&intent=${encodeURIComponent(bookingIntentId)}`,
              );
            },
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
        <button
          type="button"
          onClick={cancelPayment}
          className="mt-4 text-xs text-foreground/60 underline"
        >
          Cancel and pick a different time
        </button>
      </div>
    );
  }

  if (loadingServices) {
    return (
      <Shell>
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
        <p className="mt-3 text-sm text-foreground/70">Loading sessions…</p>
      </Shell>
    );
  }

  if (services.length === 0) {
    return (
      <Shell>
        <p className="font-serif text-lg text-foreground">Booking coming soon</p>
        <p className="mt-2 text-sm text-foreground/70">
          This therapist hasn&apos;t published their session options yet.
        </p>
      </Shell>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
      <ol className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-foreground/50">
        <li className={step === "service" ? "text-primary" : ""}>1 Session</li>
        <li aria-hidden>·</li>
        <li className={step === "slot" ? "text-primary" : ""}>2 Time</li>
        <li aria-hidden>·</li>
        <li>3 Payment</li>
      </ol>

      {step === "service" && (
        <ul className="space-y-3">
          {services.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => chooseService(s)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/60">
                    <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} minutes
                  </span>
                  {s.description && (
                    <span className="mt-1 block text-xs text-foreground/60">{s.description}</span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold text-foreground">
                  {formatPrice(s.price_cents, s.currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === "slot" && service && (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{service.name}</p>
              <p className="text-xs text-foreground/60">
                {service.duration_minutes} min ·{" "}
                {formatPrice(service.price_cents, service.currency)}
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-foreground/60 underline"
              onClick={() => {
                setStep("service");
                setSlot(null);
                setShowDetails(false);
                setError(null);
              }}
            >
              Change
            </button>
          </div>

          {loadingSlots ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              <p className="mt-3 text-sm text-foreground/70">Finding available times…</p>
            </div>
          ) : error && grouped.length === 0 ? (
            <p className="rounded-lg bg-muted/50 p-4 text-sm text-foreground/70">{error}</p>
          ) : showDetails && slot ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm text-foreground">
                <CalendarDays className="h-4 w-4" /> {dayKey(slot)} · {timeLabel(slot)}
              </p>
              <button
                type="button"
                className="text-xs text-foreground/60 underline"
                onClick={() => {
                  setShowDetails(false);
                  setError(null);
                }}
              >
                Change time
              </button>
            </div>
          ) : (
            <div className="max-h-[380px] space-y-4 overflow-y-auto pr-1">
              {grouped.map(([day, times]) => (
                <div key={day}>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
                    <CalendarDays className="h-3.5 w-3.5" /> {day}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {times.map((iso) => (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => {
                          setSlot(iso);
                          setError(null);
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                          slot === iso
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 text-foreground hover:border-primary/60"
                        }`}
                      >
                        {timeLabel(iso)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {slot &&
            showDetails &&
            !signedIn &&
            !loadingSlots &&
            !(error && grouped.length === 0) && (
              <div
                id="booking-guest-details"
                className="mt-5 space-y-3 rounded-xl border border-border/60 p-4"
              >
                <p className="text-sm font-medium text-foreground">Your details</p>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  maxLength={255}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                  />
                  Create a free account to see all your sessions in one place
                </label>
                {createAccount && (
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Choose a password (8+ characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                  />
                )}
                <p className="text-[11px] text-foreground/60">
                  No account needed. You can cancel or reschedule from your confirmation email.{" "}
                  Already have an account?{" "}
                  <a
                    href={`/client/signup?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                    className="underline"
                  >
                    Sign in
                  </a>
                </p>
              </div>
            )}
          <div className="sticky bottom-0 -mx-5 mt-5 border-t border-border/60 bg-card px-5 pb-1 pt-3">
            {slot && error && !loadingSlots && grouped.length > 0 && (
              <p role="alert" className="mb-2 text-center text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!slot || submitting}
              onClick={() => {
                if (!signedIn && !showDetails) {
                  setError(null);
                  setShowDetails(true);
                  return;
                }
                void beginPayment();
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Holding your slot…
                </>
              ) : !signedIn && !showDetails ? (
                "Continue"
              ) : (
                `Continue to payment${slot ? ` · ${formatPrice(service.price_cents, service.currency)}` : ""}`
              )}
            </Button>
            <p className="mt-2 text-center text-[11px] text-foreground/50">
              We hold your time for 15 minutes while you pay.
            </p>
          </div>
        </div>
      )}

      {step === "service" && error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function HoldCountdown({
  expiresAt,
  onExpired,
}: {
  expiresAt: string | null;
  onExpired: () => void;
}) {
  const [left, setLeft] = useState<number>(() =>
    expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0,
  );

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => {
      const ms = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setLeft(ms);
      if (ms === 0) {
        window.clearInterval(id);
        onExpired();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpired]);

  if (!expiresAt) return null;
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <Clock className="h-3.5 w-3.5" /> {minutes}:{String(seconds).padStart(2, "0")} held
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      {children}
    </div>
  );
}
