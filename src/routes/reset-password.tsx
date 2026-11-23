import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/user-roles.functions";
import { getMyTherapistProfile } from "@/lib/therapist-profiles.functions";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({ meta: [{ title: "Reset password — Veyro Health" }] }),
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    (async () => {
      try {
        // Newer Supabase recovery links use PKCE: ?code=... in the query
        // string. Older links deliver tokens in the URL hash and Supabase
        // parses them automatically. Handle both.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!cancelled) {
            if (error) setError(error.message);
            else {
              setReady(true);
              // Clean the code out of the URL so a refresh doesn't retry.
              url.searchParams.delete("code");
              window.history.replaceState({}, "", url.pathname + url.search + url.hash);
            }
          }
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not verify reset link");
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      toast.success("Password updated.");
      try {
        const { roles } = await getMyRoles();
        if (roles.includes("therapist")) {
          try {
            const { profile } = await getMyTherapistProfile();
            nav({ to: profile ? "/therapist/dashboard" : "/therapist/onboarding" });
          } catch {
            nav({ to: "/therapist/onboarding" });
          }
        } else {
          nav({ to: "/client/dashboard" });
        }
      } catch {
        nav({ to: "/client/dashboard" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[480px] px-6 py-16">
        <h1 className="font-serif text-3xl text-foreground">Set a new password</h1>
        <p className="mt-2 text-sm text-foreground/70">
          {ready ? "Choose a new password for your account." : "Verifying reset link…"}
        </p>

        {ready && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
                New password
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
                <Lock className="h-4 w-4 text-foreground/50" />
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Confirm password
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
                <Lock className="h-4 w-4 text-foreground/50" />
                <input
                  required
                  type="password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
