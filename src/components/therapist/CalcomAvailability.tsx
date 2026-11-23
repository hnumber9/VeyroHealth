import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, ExternalLink, Loader2 } from "lucide-react";
import {
  connectCalcom,
  disconnectCalcom,
  getCalcomOAuthAvailability,
  getMyCalcomConnection,
  startCalcomOAuth,
} from "@/lib/calcom.functions";

type Conn = {
  calcom_username: string;
  calcom_email: string | null;
  calcom_name: string | null;
  timezone: string | null;
  connection_status: string;
  created_at: string;
} | null;

export function CalcomAvailability({ onConnectedChange }: { onConnectedChange?: () => void }) {
  const fetchConn = useServerFn(getMyCalcomConnection);
  const connect = useServerFn(connectCalcom);
  const disconnect = useServerFn(disconnectCalcom);
  const startOAuth = useServerFn(startCalcomOAuth);
  const fetchOAuthAvailability = useServerFn(getCalcomOAuthAvailability);

  const [conn, setConn] = useState<Conn>(null);
  const [loaded, setLoaded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthAvailable, setOauthAvailable] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchConn({})
      .then((res) => {
        if (!cancelled) setConn(res.connection as Conn);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchConn]);

  useEffect(() => {
    let cancelled = false;
    fetchOAuthAvailability({})
      .then((res) => {
        if (!cancelled) setOauthAvailable(res.oauthAvailable);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fetchOAuthAvailability]);

  // Surface the result of returning from Cal.com's authorisation screen.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("calcom");
    if (!status) return;
    if (status === "connected") {
      setMsg("Calendar connected. Your sessions are now published to Cal.com.");
    } else {
      setError(
        `We couldn't finish connecting your Cal.com account${
          params.get("reason") ? ` (${params.get("reason")})` : ""
        }. Please try again.`,
      );
    }
    params.delete("calcom");
    params.delete("reason");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, []);

  async function handleOAuthConnect() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await startOAuth({ data: { returnOrigin: window.location.origin } });
      // Cal.com blocks being framed, so authorise in a new top-level tab.
      const opened = window.open(res.url, "_blank", "noopener,noreferrer");
      if (opened) {
        setMsg("Approve Veyro in the Cal.com tab — this page updates automatically.");
        // Watch for the connection appearing once the therapist approves in the
        // other tab, so they never have to refresh manually.
        let attempts = 0;
        const poll = window.setInterval(async () => {
          attempts += 1;
          try {
            const check = await fetchConn({});
            if (check.connection) {
              window.clearInterval(poll);
              setConn(check.connection as Conn);
              setMsg("Calendar connected. Your sessions are now published to Cal.com.");
              setBusy(false);
              onConnectedChange?.();
              return;
            }
          } catch {
            // keep polling
          }
          if (attempts >= 60) {
            window.clearInterval(poll);
            setBusy(false);
          }
        }, 3000);
      } else {
        window.location.href = res.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the Cal.com connection.");
      setBusy(false);
    }
  }

  async function handleConnect() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await connect({ data: { apiKey: apiKey.trim() } });
      setConn({
        calcom_username: res.connection.calcom_username,
        calcom_email: res.connection.calcom_email ?? null,
        calcom_name: res.connection.calcom_name ?? null,
        timezone: null,
        connection_status: "connected",
        created_at: new Date().toISOString(),
      });
      setApiKey("");
      setMsg(
        res.syncedServices > 0
          ? `Calendar connected — ${res.syncedServices} session type${res.syncedServices === 1 ? "" : "s"} published to Cal.com.`
          : "Calendar connected. Add your sessions and prices next so clients can book.",
      );
      onConnectedChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect your calendar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Disconnect your calendar? Your profile will come out of the directory until you reconnect.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await disconnect({});
      setConn(null);
      setMsg("Calendar disconnected. Your profile is no longer bookable.");
      onConnectedChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't disconnect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {loaded && !conn && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Your profile isn&apos;t live yet</p>
          <p className="mt-1 text-sm text-foreground/70">
            You&apos;ve been approved by the Veyro clinical team. Connect your calendar below and
            add your sessions — your profile goes live in the directory as soon as both are done.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-foreground">Calendar and availability</h2>
            <p className="mt-2 text-sm text-foreground/70">
              Veyro uses Cal.com (free) to read your real availability and create the video meeting
              for each session. Clients book and pay on Veyro — never on a third-party page.
            </p>
          </div>
          <CalendarCheck className="h-6 w-6 shrink-0 text-primary" />
        </div>

        {msg && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground/80">
            {msg}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loaded ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : conn ? (
          <div className="mt-6 space-y-4">
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${conn.connection_status === "error" ? "border-destructive/40 bg-destructive/5" : "border-border bg-secondary/30"}`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${conn.connection_status === "error" ? "text-destructive" : "text-foreground/60"}`}
              >
                {conn.connection_status === "error"
                  ? "Calendar needs reconnecting"
                  : "Connected calendar"}
              </p>
              <p className="mt-1 font-medium text-foreground">
                {conn.calcom_name ?? conn.calcom_email ?? conn.calcom_username}
              </p>
              <p className="text-xs text-foreground/60">cal.com/{conn.calcom_username}</p>
              {conn.connection_status === "error" && (
                <p className="mt-2 text-sm text-destructive">
                  Your Cal.com link has expired, so clients can't book you right now. Press
                  "Reconnect Cal.com" to fix it.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {conn.connection_status === "error" && oauthAvailable && (
                <button
                  type="button"
                  onClick={handleOAuthConnect}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  Reconnect Cal.com
                </button>
              )}
              <a
                href="https://app.cal.com/availability"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/40"
              >
                <ExternalLink className="h-4 w-4" /> Edit my working hours
              </a>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-background px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                Disconnect calendar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {oauthAvailable && (
              <>
                <ol className="space-y-3 text-sm text-foreground/80">
                  <Step n={1}>
                    Create a free account at{" "}
                    <a
                      className="font-medium text-primary underline"
                      href="https://cal.com/signup"
                      target="_blank"
                      rel="noreferrer"
                    >
                      cal.com/signup
                    </a>{" "}
                    (skip if you already have one).
                  </Step>
                  <Step n={2}>
                    In Cal.com, connect the calendar you actually use (Google or Microsoft) and turn
                    on Google Meet or Teams so each session gets a video link automatically.
                  </Step>
                  <Step n={3}>
                    Set your working hours under <strong>Availability</strong>.
                  </Step>
                  <Step n={4}>
                    Come back here and press <strong>Continue with Cal.com</strong> — one click, no
                    keys to copy.
                  </Step>
                </ol>

                <button
                  type="button"
                  onClick={handleOAuthConnect}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Cal.com…
                    </>
                  ) : (
                    "Continue with Cal.com"
                  )}
                </button>

                {!showApiKey && (
                  <button
                    type="button"
                    onClick={() => setShowApiKey(true)}
                    className="block text-xs font-medium text-foreground/60 underline"
                  >
                    Having trouble? Connect with an API key instead
                  </button>
                )}
              </>
            )}

            {(!oauthAvailable || showApiKey) && (
              <div className="space-y-4">
                {!oauthAvailable && (
                  <ol className="space-y-3 text-sm text-foreground/80">
                    <Step n={1}>
                      Create a free account at{" "}
                      <a
                        className="font-medium text-primary underline"
                        href="https://cal.com/signup"
                        target="_blank"
                        rel="noreferrer"
                      >
                        cal.com/signup
                      </a>
                      .
                    </Step>
                    <Step n={2}>
                      In Cal.com, connect the calendar you actually use (Google or Microsoft) and
                      turn on Google Meet or Teams so each session gets a video link automatically.
                    </Step>
                    <Step n={3}>
                      Set your working hours under <strong>Availability</strong>.
                    </Step>
                    <Step n={4}>
                      Go to <strong>Settings → Developer → API keys</strong>, create a key with no
                      expiry, and paste it below.
                    </Step>
                  </ol>
                )}

                <div>
                  <label
                    htmlFor="calcom-api-key"
                    className="text-xs font-semibold uppercase tracking-wider text-foreground/60"
                  >
                    Cal.com API key
                  </label>
                  <input
                    id="calcom-api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    placeholder="cal_live_…"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary"
                  />
                  <p className="mt-2 text-xs text-foreground/60">
                    We store this securely and use it only to read your availability and create your
                    bookings.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={busy || apiKey.trim().length < 10}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/40 disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
                    </>
                  ) : (
                    "Connect with API key"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
