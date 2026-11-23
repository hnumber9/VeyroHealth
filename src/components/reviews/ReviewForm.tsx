import { useState } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { TRAIT_GROUPS } from "@/lib/therapist-traits";
import { submitReview } from "@/lib/reviews.functions";
import { deleteMyReview } from "@/lib/client-account.functions";

interface Props {
  therapistId: string;
  therapistName?: string;
  existing?: { id: string; rating: number; body: string | null; traits: string[] | null } | null;
  onSaved?: () => void;
  onDeleted?: () => void;
  compact?: boolean;
}

const schema = z.object({
  rating: z.number().int().min(1, "Choose a rating").max(5),
  body: z.string().trim().max(1000, "Please keep under 1000 characters").optional(),
});

export function ReviewForm({
  therapistId,
  therapistName,
  existing,
  onSaved,
  onDeleted,
  compact,
}: Props) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [traits, setTraits] = useState<string[]>(existing?.traits ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTrait(t: string) {
    setTraits((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ rating, body: body || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      await submitReview({
        data: { therapist_id: therapistId, rating, body: body || null, traits },
      });
      toast.success(existing ? "Review updated." : "Thanks for sharing your feedback.");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    if (!confirm("Delete this review?")) return;
    setSaving(true);
    try {
      await deleteMyReview({ data: { id: existing.id } });
      toast.success("Review deleted.");
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact ? "space-y-4" : "space-y-5 rounded-2xl border border-border/60 bg-card p-6"
      }
    >
      {!compact && (
        <div>
          <h3 className="font-serif text-lg text-foreground">
            {existing
              ? "Edit your review"
              : `Leave a review${therapistName ? ` for ${therapistName}` : ""}`}
          </h3>
          <p className="mt-1 text-xs text-foreground/60">
            Your rating and traits show on the therapist's public profile. Your name is not shown.
          </p>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Rating
        </p>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1 transition"
              >
                <Star
                  className={`h-6 w-6 ${filled ? "fill-amber-500 text-amber-500" : "text-foreground/30"}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Traits (choose any that fit)
        </p>
        <div className="space-y-3">
          {TRAIT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[11px] font-medium text-foreground/60">
                <span aria-hidden>{group.emoji}</span> {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.traits.map((t) => {
                  const active = traits.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTrait(t)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-foreground/70 hover:border-primary/40"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Your review (optional)
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="What was your experience like?"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
          />
          <span className="mt-1 block text-right text-[11px] text-foreground/50">
            {body.length}/1000
          </span>
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {existing ? "Update review" : "Submit review"}
        </button>
        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>
    </form>
  );
}
