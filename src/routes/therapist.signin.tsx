import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Mail, Lock, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyTherapistProfile } from "@/lib/therapist-profiles.functions";
import logo from "@/assets/veyro-logo.png";

export const Route = createFileRoute("/therapist/signin")({
  component: TherapistSignin,
  head: () => ({ meta: [{ title: "Therapist sign in — Veyro Health" }] }),
});

const signinSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(128),
});

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Please confirm your email before signing in.";
  return msg;
}

async function routeAfterAuth(nav: ReturnType<typeof useNavigate>): Promise<string | null> {
  // Therapist role is granted server-side on approval. Applicants in progress
  // may only hold the 'client' role (or none) until then; either way, RLS
  // scopes onboarding/profile writes by user_id, so let them through.
  try {
    const { profile } = await getMyTherapistProfile();
    nav({ to: profile ? "/therapist/dashboard" : "/therapist/onboarding" });
  } catch {
    nav({ to: "/therapist/onboarding" });
  }
  return null;
}

function TherapistSignin() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const err = await routeAfterAuth(nav);
      if (err && !cancelled) setError(err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const parsed = z.string().trim().email().safeParse(email);
        if (!parsed.success) {
          setError("Enter a valid email");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: "https://veyrohealth.com/reset-password",
        });
        if (error) {
          setError(friendlyError(error.message));
          return;
        }
        setResetSent(true);
        toast.success("Password reset email sent.");
        return;
      }
      const parsed = signinSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        setError(friendlyError(error.message));
        return;
      }
      const err = await routeAfterAuth(nav);
      if (err) {
        setError(err);
        return;
      }
      toast.success("Signed in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-10">
        <Link to="/" aria-label="Veyro">
          <img src={logo} alt="Veyro" className="h-12 w-auto opacity-90" />
        </Link>
      </div>
      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <section className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              For practitioners
            </p>
            <h1 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">
              Welcome back
            </h1>
            <p className="text-base text-foreground/75">
              Sign in to manage your Veyro profile, availability and clients.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-foreground/80">
              {[
                "Manage your availability and Calendly connection",
                "Review upcoming sessions and client messages",
                "Update your public profile and pricing",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" /> {b}
                </li>
              ))}
            </ul>
            <p className="pt-4 text-sm text-foreground/70">
              Not a Veyro therapist yet?{" "}
              <a href="/#apply" className="font-semibold text-primary hover:underline">
                Apply to join
              </a>
              .
            </p>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-8 shadow-[var(--shadow-soft)]">
            {resetSent ? (
              <div className="space-y-4 text-center">
                <h2 className="font-serif text-2xl text-foreground">Reset link sent</h2>
                <p className="text-sm text-foreground/70">
                  Check <strong>{email}</strong> for a link to set a new password.
                </p>
                <button
                  onClick={() => {
                    setResetSent(false);
                    setMode("signin");
                  }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <h2 className="mb-6 font-serif text-2xl text-foreground">
                  {mode === "forgot" ? "Reset your password" : "Therapist sign in"}
                </h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <Field label="Email" icon={Mail}>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@practice.com"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                    />
                  </Field>
                  {mode === "signin" && (
                    <Field label="Password" icon={Lock}>
                      <input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                      />
                    </Field>
                  )}
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
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {mode === "forgot" ? "Send reset link" : "Sign in"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                  {mode === "signin" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                      }}
                      className="block w-full text-center text-xs text-foreground/60 hover:text-primary hover:underline"
                    >
                      Forgot your password?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        setError(null);
                      }}
                      className="block w-full text-center text-xs text-foreground/60 hover:text-primary hover:underline"
                    >
                      Back to sign in
                    </button>
                  )}
                </form>
              </>
            )}
          </section>
        </div>
      </main>
      <div className="pb-8 text-center text-xs text-foreground/50">
        Operated by Veyro Health LTD
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
        <Icon className="h-4 w-4 text-foreground/50" />
        {children}
      </div>
    </label>
  );
}
