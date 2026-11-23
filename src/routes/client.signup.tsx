import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowRight, Mail, Lock, User, HeartHandshake, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { linkClientToExistingRecords } from "@/lib/client-account.functions";
import { assignMyRole, getMyRoles } from "@/lib/user-roles.functions";

export const Route = createFileRoute("/client/signup")({
  component: ClientSignup,
  head: () => ({ meta: [{ title: "Sign in — Veyro Health" }] }),
});

const searchSchema = z.object({
  redirect: z.string().optional(),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
const signinSchema = signupSchema.pick({ email: true, password: true });

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("user already registered"))
    return "An account already exists for this email. Try signing in instead.";
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Please confirm your email before signing in.";
  return msg;
}

function isInternalRedirect(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin && !u.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

async function afterAuth(nav: ReturnType<typeof useNavigate>, redirect?: string) {
  try {
    await linkClientToExistingRecords();
  } catch {
    /* non-fatal */
  }
  if (redirect && isInternalRedirect(redirect)) {
    nav({ href: redirect });
  } else {
    nav({ to: "/client/dashboard" });
  }
}

// Verify signed-in account is a client. If it's therapist-only, sign out
// and return an error message. For new signups (or accounts with no roles
// yet, e.g. legacy Google users), assign the 'client' role.
async function ensureClientRole(): Promise<string | null> {
  try {
    const { roles } = await getMyRoles();
    if (roles.includes("client")) return null;
    if (roles.includes("therapist")) {
      await supabase.auth.signOut();
      return "This email is registered as a therapist account. Please use the therapist sign-in, or sign up as a client with a different email.";
    }
    await assignMyRole({ data: { role: "client" } });
    return null;
  } catch (err) {
    await supabase.auth.signOut();
    return err instanceof Error ? err.message : "Could not verify your account.";
  }
}

function ClientSignup() {
  const nav = useNavigate();
  const rawSearch = useSearch({ from: "/client/signup" });
  const search = searchSchema.parse(rawSearch);
  const redirect = search.redirect;
  const [mode, setMode] = useState<"signup" | "signin" | "forgot">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = async () => {
      const roleErr = await ensureClientRole();
      if (cancelled) return;
      if (roleErr) {
        setError(roleErr);
        return;
      }
      afterAuth(nav, redirect);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) handle();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) handle();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirect]);

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
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({ fullName, email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        const parts = parsed.data.fullName.split(/\s+/);
        const first_name = parts[0];
        const last_name = parts.slice(1).join(" ") || null;
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { first_name, last_name, full_name: parsed.data.fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          setError(friendlyError(error.message));
          return;
        }
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          const roleErr = await ensureClientRole();
          if (roleErr) {
            setError(roleErr);
            return;
          }
          toast.success("Account created.");
          afterAuth(nav, redirect);
        } else setNeedsConfirm(true);
      } else {
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
        const roleErr = await ensureClientRole();
        if (roleErr) {
          setError(roleErr);
          return;
        }
        toast.success("Signed in.");
        afterAuth(nav, redirect);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      afterAuth(nav, redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  const isSignin = mode === "signin";
  const isForgot = mode === "forgot";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1100px] px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <section className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              For clients
            </p>
            <h1 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">
              Your Veyro account
            </h1>
            <p className="text-base text-foreground/75">
              Keep your upcoming sessions, join links, and past reviews in one place. Sign in to
              manage your care.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-foreground/80">
              {[
                "See your upcoming sessions and join links",
                "Leave a review for therapists you've worked with",
                "Private, GDPR-conscious infrastructure",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <HeartHandshake className="mt-0.5 h-4 w-4 text-primary" /> {b}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-8 shadow-[var(--shadow-soft)]">
            {!isForgot && (
              <div className="mb-6 flex rounded-full bg-secondary p-1 text-sm">
                <button
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className={`flex-1 rounded-full py-2 font-semibold transition ${!isSignin ? "bg-card shadow-sm text-foreground" : "text-foreground/60"}`}
                >
                  Create account
                </button>
                <button
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className={`flex-1 rounded-full py-2 font-semibold transition ${isSignin ? "bg-card shadow-sm text-foreground" : "text-foreground/60"}`}
                >
                  Sign in
                </button>
              </div>
            )}

            {needsConfirm ? (
              <div className="space-y-4 text-center">
                <h2 className="font-serif text-2xl text-foreground">Check your email</h2>
                <p className="text-sm text-foreground/70">
                  We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
                  account, then come back and sign in.
                </p>
                <button
                  onClick={() => {
                    setNeedsConfirm(false);
                    setMode("signin");
                  }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : resetSent ? (
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
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-secondary/50 disabled:opacity-60"
                >
                  <GoogleIcon /> Continue with Google
                </button>
                <div className="my-4 flex items-center gap-3 text-xs text-foreground/50">
                  <div className="h-px flex-1 bg-border" /> or{" "}
                  <div className="h-px flex-1 bg-border" />
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {mode === "signup" && (
                    <Field label="Full name" icon={User}>
                      <input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                      />
                    </Field>
                  )}
                  <Field label="Email" icon={Mail}>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                    />
                  </Field>
                  {!isForgot && (
                    <Field label="Password" icon={Lock}>
                      <input
                        required
                        type="password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isSignin ? "Your password" : "At least 8 characters"}
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
                    {isForgot ? "Send reset link" : isSignin ? "Sign in" : "Create account"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                  {isSignin && !isForgot && (
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
                  )}
                  {isForgot && (
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
      <Footer />
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof User;
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C41 34.7 44 29.8 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
