import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  slots: string[];
  moving: string | null;
  onPick: (slotStart: string) => void;
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Month → day → time picker for available booking slots. */
export function SlotDayTimePicker({ slots, moving, onPick }: Props) {
  const byDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of slots) {
      const k = dayKey(new Date(s));
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return map;
  }, [slots]);

  const days = useMemo(() => Array.from(byDay.keys()).sort(), [byDay]);
  const months = useMemo(() => Array.from(new Set(days.map((d) => d.slice(0, 7)))).sort(), [days]);

  const [monthIdx, setMonthIdx] = useState(0);
  const month = months[monthIdx] ?? months[0];
  const monthDays = days.filter((d) => d.startsWith(month ?? ""));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const activeDay =
    selectedDay && monthDays.includes(selectedDay) ? selectedDay : (monthDays[0] ?? null);
  const times = activeDay ? (byDay.get(activeDay) ?? []) : [];

  if (days.length === 0) return null;

  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
          disabled={monthIdx === 0}
          className="rounded-lg border border-border p-1.5 text-foreground/70 disabled:opacity-40"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
          disabled={monthIdx >= months.length - 1}
          className="rounded-lg border border-border p-1.5 text-foreground/70 disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {monthDays.map((d) => {
          const date = new Date(`${d}T00:00:00`);
          const active = d === activeDay;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`min-w-[58px] shrink-0 rounded-xl border px-2 py-2 text-center transition ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-foreground/70 hover:border-primary/40"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wide text-foreground/60">
                {date.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="block text-base font-semibold">{date.getDate()}</span>
              <span className="block text-[10px] text-foreground/50">
                {(byDay.get(d) ?? []).length} slot{(byDay.get(d) ?? []).length === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
        {times.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            disabled={moving !== null}
            className="rounded-lg border border-border px-2 py-2 text-xs font-medium text-foreground transition hover:border-primary/50 disabled:opacity-50"
          >
            {moving === s
              ? "Moving…"
              : new Date(s).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </button>
        ))}
      </div>
    </div>
  );
}
