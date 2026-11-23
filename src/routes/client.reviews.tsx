import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyReview, getMyReviews } from "@/lib/client-account.functions";

export const Route = createFileRoute("/client/reviews")({
  component: MyReviews,
  head: () => ({ meta: [{ title: "My reviews — Veyro Health" }] }),
});

type Data = Awaited<ReturnType<typeof getMyReviews>>["reviews"];

function MyReviews() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Data>([]);

  const load = useCallback(async () => {
    const res = await getMyReviews();
    setReviews(res.reviews);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        nav({ to: "/client/signup" });
        return;
      }
      try {
        await load();
      } finally {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await deleteMyReview({ data: { id } });
      toast.success("Review deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
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
        <h1 className="mb-6 font-serif text-3xl text-foreground">My reviews</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-sm text-foreground/60">
            You haven't left any reviews yet. Reviews you submit will appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {r.therapist?.display_name ?? "Therapist"}
                    </p>
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {r.therapist && (
                      <Link
                        to="/therapist/$slug"
                        params={{ slug: r.therapist.slug }}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:border-primary/40"
                      >
                        Edit on profile
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
                {r.body && (
                  <p className="mt-3 whitespace-pre-line text-sm text-foreground/85">{r.body}</p>
                )}
                {r.traits && r.traits.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.traits.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
