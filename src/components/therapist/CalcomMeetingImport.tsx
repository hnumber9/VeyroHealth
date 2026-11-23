import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Check, Loader2, RefreshCw } from "lucide-react";
import {
  importCalcomEventType,
  listCalcomEventTypes,
  type EventTypeOption,
} from "@/lib/calcom-services.functions";

export function CalcomMeetingImport({ onImported }: { onImported?: () => void }) {
  const fetchEventTypes = useServerFn(listCalcomEventTypes);
  const importEventType = useServerFn(importCalcomEventType);

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Nonce keeps the refresh from being served a cached response.
      const res = await fetchEventTypes({ data: { nonce: Date.now() } });
      setConnected(res.connected);
      setEventTypes(res.eventTypes);
      setWarnings(res.warnings ?? []);
      setPrices((prev) => {
        const next = { ...prev };
        for (const et of res.eventTypes) {
          if (et.price_cents != null && next[et.id] === undefined) {
            next[et.id] = (et.price_cents / 100).toString();
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your Cal.com meetings.");
    } finally {
      setLoading(false);
    }
  }, [fetchEventTypes]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleImport(et: EventTypeOption) {
    const raw = (prices[et.id] ?? "").trim();
    const value = Number(raw);
    if (!raw || Number.isNaN(value) || value < 0) {
      setError(`Enter a price for “${et.title}”.`);
      return;
    }
    setBusyId(et.id);
    setError(null);
    setMsg(null);
    try {
      await importEventType({ data: { eventTypeId: et.id, priceCents: Math.round(value * 100) } });
      setMsg(`“${et.title}” is now bookable at £${value.toFixed(2)}.`);
      await load();
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't import that meeting.");
    } finally {
      setBusyId(null);
    }
  }

  if (!loading && !connected) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-foreground">Meetings, availability and pricing</h2>
          <p className="mt-2 max-w-xl text-sm text-foreground/70">
            These are the meeting types and availability on your connected Cal.com calendar. Set a
            price for each meeting to make it bookable and payable on Veyro. To add, edit or remove
            a meeting type, do it in Cal.com and hit Refresh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/40 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
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
      {warnings.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl border border-border bg-accent/30 px-4 py-3 text-sm text-foreground/75">
          {warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      )}

      {loading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-foreground/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading meetings from Cal.com…
        </p>
      ) : eventTypes.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-foreground/60">
          No meeting types found on your Cal.com account yet. Create them in Cal.com, then hit
          Refresh.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {eventTypes.map((et) => (
            <li
              key={et.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{et.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/60">
                  <CalendarClock className="h-3.5 w-3.5" /> {et.duration_minutes} min
                  {et.hidden && (
                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/60">
                      Hidden in Cal.com
                    </span>
                  )}
                  {!et.hidden && et.imported && et.price_cents != null && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <Check className="h-3 w-3" /> Bookable at £{(et.price_cents / 100).toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                  <span className="text-foreground/60">£</span>
                  <input
                    value={prices[et.id] ?? ""}
                    onChange={(e) => setPrices({ ...prices, [et.id]: e.target.value })}
                    inputMode="decimal"
                    placeholder="85"
                    aria-label={`Price for ${et.title}`}
                    className="w-16 bg-transparent outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleImport(et)}
                  disabled={busyId === et.id}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busyId === et.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : et.imported ? (
                    "Update price"
                  ) : (
                    "Set price"
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
