import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/signin")({
  component: AdminSignin,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin sign in — Veyro Health" },
      {
        name: "description",
        content: "Sign in to the internal Veyro admin area to review therapist applications.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin sign in — Veyro Health" },
      {
        property: "og:description",
        content: "Sign in to the internal Veyro admin area to review therapist applications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminSignin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setResetSent(true);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("invalid login")
          ? "Email or password is incorrect."
          : signInError.message,
      );
      return;
    }
    nav({ to: "/admin", search: { review: undefined }, replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">
          <ShieldCheck className="h-4 w-4" /> Veyro admin
        </div>
        <h1 className="mt-2 font-serif text-2xl text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-foreground/70">
          {mode === "forgot" ? "We'll email you a reset link." : "Internal access only."}
        </p>

        {resetSent ? (
          <p className="mt-6 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground/80">
            If an account exists for {email.trim()}, a password reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                Email
              </span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
                <Mail className="h-4 w-4 text-foreground/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground outline-none"
                  placeholder="you@veyrohealth.com"
                  autoComplete="email"
                />
              </div>
            </label>
            {mode === "signin" && (
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                  Password
                </span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
                  <Lock className="h-4 w-4 text-foreground/40" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground outline-none"
                    autoComplete="current-password"
                  />
                </div>
              </label>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? mode === "forgot"
                  ? "Sending…"
                  : "Signing in…"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === "forgot" ? "signin" : "forgot");
              }}
              className="w-full text-center text-xs font-medium text-foreground/60 underline hover:text-foreground"
            >
              {mode === "forgot" ? "Back to sign in" : "Forgot your password?"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
