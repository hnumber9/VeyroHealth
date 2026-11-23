import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Mail, Lock, User, ShieldCheck, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyTherapistProfile } from "@/lib/therapist-profiles.functions";
import { getMyRoles } from "@/lib/user-roles.functions";
import logo from "@/assets/veyro-logo.png";

export const Route = createFileRoute("/therapist/signup")({
  component: TherapistSignup,
  head: () => ({
    meta: [
      { title: "Therapist signup — Veyro Health" },
      { name: "description", content: "Private invite-only signup for Veyro therapists." },
      { property: "og:title", content: "Therapist signup — Veyro Health" },
      { property: "og:description", content: "Private invite-only signup for Veyro therapists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name").max(120),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("user already registered"))
    return "An account already exists for this email. Try signing in instead.";
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (
    m.includes("weak") ||
    m.includes("pwned") ||
    m.includes("compromised") ||
    m.includes("data breach")
  )
    return "That password has appeared in a known data breach, so it can't be used. Please choose a different one (a longer passphrase with mixed characters works best).";
  return msg;
}

async function routeAfterAuth(nav: ReturnType<typeof useNavigate>) {
  try {
    const { profile } = await getMyTherapistProfile();
    nav({ to: profile ? "/therapist/dashboard" : "/therapist/onboarding" });
  } catch {
    nav({ to: "/therapist/onboarding" });
  }
}

async function ensureTherapistRole(_isNewSignup: boolean): Promise<string | null> {
  try {
    const { roles } = await getMyRoles();
    if (roles.includes("therapist")) return null;
    if (roles.includes("client")) {
      await supabase.auth.signOut();
      return "This email is registered as a client account. Please use the client sign-in, or sign up as a therapist with a different email.";
    }
    // Therapist role is granted by the Veyro clinical team on approval, not
    // self-assigned. Signed-in therapists without the role yet can still
    // build their profile (RLS is scoped by user_id, not role).
    return null;
  } catch (err) {
    await supabase.auth.signOut();
    return err instanceof Error ? err.message : "Could not verify your account.";
  }
}

function TherapistSignup() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const parsed = signupSchema.safeParse({ fullName, email, password, confirmPassword });
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
          data: {
            first_name,
            last_name,
            full_name: parsed.data.fullName,
            signup_type: "therapist",
          },
          emailRedirectTo: `${window.location.origin}/therapist/signin`,
        },
      });
      if (error) {
        setError(friendlyError(error.message));
        return;
      }
      let session = data.session;
      if (!session) {
        const signIn = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        session = signIn.data.session ?? null;
      }
      if (session) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        const roleErr = await ensureTherapistRole(true);
        if (roleErr) {
          setError(roleErr);
          return;
        }
        toast.success("Account created.");
        routeAfterAuth(nav);
      } else {
        setNeedsConfirm(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-10">
        <img src={logo} alt="Veyro" className="h-12 w-auto opacity-90" />
      </div>
      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <section className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              For practitioners
            </p>
            <p className="text-sm font-medium text-foreground/80">
              Join before launch to receive Founding Therapist status
            </p>
            <h1 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">
              Join the Veyro practitioner network
            </h1>
            <p className="text-base text-foreground/75">
              Build your practice on a calm, premium platform. Manage your availability, securely
              store session notes, and message clients — all in one place.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-foreground/80">
              {[
                "Secure, GDPR-conscious infrastructure",
                "Set your own pricing and availability",
                "Offer free introductory consultations",
                "Verified profile shown to matched clients",
                "Online Therapy",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" /> {b}
                </li>
              ))}
            </ul>
            <p className="text-sm text-foreground/70">
              Built for therapists providing online mental health support.
            </p>
            <div className="mt-6 rounded-2xl border border-border/60 bg-secondary/40 p-5 text-sm text-foreground/75">
              <strong className="text-foreground">Approval process:</strong> All practitioner
              profiles are reviewed by the Veyro clinical team before being shown to clients. You'll
              be able to set up your profile immediately after signing up.
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-8 shadow-[var(--shadow-soft)]">
            {needsConfirm ? (
              <div className="space-y-4 text-center">
                <h2 className="font-serif text-2xl text-foreground">Check your email</h2>
                <p className="text-sm text-foreground/70">
                  We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
                  account, then come back and sign in.
                </p>
              </div>
            ) : (
              <>
                <h2 className="mb-6 font-serif text-2xl text-foreground">Create your account</h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <Field label="Full name" icon={User}>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Eva Kowalski"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                    />
                  </Field>
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
                  <Field label="Password" icon={Lock}>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                    />
                  </Field>
                  <Field label="Confirm password" icon={Lock}>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                    />
                  </Field>

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
                    Create account and complete profile
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                  <p className="text-center text-xs text-foreground/55">
                    You'll go straight to your profile setup after creating your account.
                  </p>
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
