import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Loader2, Plus, Trash2 } from "lucide-react";
import {
  deleteMyService,
  listMyServices,
  upsertMyService,
} from "@/lib/therapist-services.functions";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  active: boolean;
  sort_order: number;
  calcom_event_type_id: number | null;
};

type Draft = {
  id?: string;
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  active: boolean;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  duration_minutes: "50",
  price: "",
  active: true,
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function SessionsPricing() {
  const fetchServices = useServerFn(listMyServices);
  const saveService = useServerFn(upsertMyService);
  const removeService = useServerFn(deleteMyService);

  const [services, setServices] = useState<Service[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetchServices({})
      .then((res) => setServices(res.services as Service[]))
      .catch(() => setServices([]))
      .finally(() => setLoaded(true));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!draft) return;
    setError(null);
    setMsg(null);

    const duration = Number.parseInt(draft.duration_minutes, 10);
    const priceCents = Math.round(Number.parseFloat(draft.price) * 100);
    if (!draft.name.trim()) return setError("Give the session a name.");
    if (!Number.isFinite(duration) || duration < 10)
      return setError("Enter a duration of at least 10 minutes.");
    if (!Number.isFinite(priceCents) || priceCents < 0) return setError("Enter a valid price.");

    setBusy(true);
    try {
      await saveService({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          duration_minutes: duration,
          price_cents: priceCents,
          active: draft.active,
          sort_order: duration,
        },
      });
      setDraft(null);
      setMsg("Saved — this session is now bookable on your profile.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that session.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(service: Service) {
    if (!window.confirm(`Remove "${service.name}"? Clients won't be able to book it any more.`))
      return;
    setBusy(true);
    setError(null);
    try {
      await removeService({ data: { id: service.id } });
      setMsg("Session removed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-foreground">Sessions and pricing</h2>
            <p className="mt-2 max-w-xl text-sm text-foreground/70">
              Add each session you offer with its own length and price. Clients pick one, choose a
              time from your calendar, and pay on Veyro to confirm.
            </p>
          </div>
          {!draft && (
            <button
              type="button"
              onClick={() => setDraft({ ...emptyDraft })}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add a session
            </button>
          )}
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

        {draft && (
          <div className="mt-5 space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Session name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Individual therapy session"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Length (minutes)">
                <input
                  value={draft.duration_minutes}
                  onChange={(e) => setDraft({ ...draft, duration_minutes: e.target.value })}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Price (GBP)">
                <input
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  inputMode="decimal"
                  placeholder="85"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Description (optional)">
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Shown to clients when they choose this session"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Bookable on my profile
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save session"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setError(null);
                }}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-accent/40"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!loaded ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your sessions…
          </p>
        ) : services.length === 0 && !draft ? (
          <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-foreground/60">
            You haven&apos;t added any sessions yet. Add at least one so clients can book you.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {services.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.name}
                    {!s.active && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/60">
                        Hidden
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/60">
                    <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} min ·{" "}
                    {formatPrice(s.price_cents, s.currency)}
                    {!s.calcom_event_type_id && " · connect your calendar to publish"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        id: s.id,
                        name: s.name,
                        description: s.description ?? "",
                        duration_minutes: String(s.duration_minutes),
                        price: (s.price_cents / 100).toString(),
                        active: s.active,
                      })
                    }
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-accent/40"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    disabled={busy}
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                    aria-label={`Remove ${s.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
