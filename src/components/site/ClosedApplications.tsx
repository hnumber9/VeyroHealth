import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Lock } from "lucide-react";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";

/**
 * Founding-therapist applications are closed. Shown on the home page (in place of
 * the old application form) and on the therapist join page.
 */
export function ClosedApplications({ showSignIn = true }: { showSignIn?: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", note: "" });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setErrorMsg("Please enter your name and a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/public/therapist-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, note: form.note }),
      });
      if (!res.ok) throw new Error("network");
      setStatus("success");
      setForm({ name: "", email: "", note: "" });
    } catch {
      setErrorMsg("Something went wrong. Please try again in a moment.");
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-[900px] rounded-3xl border border-border/60 bg-card p-8 shadow-[var(--shadow-soft)] md:p-12">
      <div className="text-center">
        <h2 className="font-serif text-3xl font-semibold text-primary md:text-4xl">
          Founding Therapist Applications Are Now Closed
        </h2>
        <div className="mx-auto mt-5 max-w-2xl space-y-4 text-base leading-relaxed text-foreground/75">
          <p>Thank you for the incredible response to Veyro&rsquo;s Founding Therapist Network.</p>
          <p>
            As we prepare for launch, we have now closed applications to our founding cohort so we
            can focus on supporting and onboarding the therapists already joining us.
          </p>
          <p>
            If you have already submitted an application, there is no need to apply again. We are
            working through the remaining applications and will be in touch shortly.
          </p>
          <p>
            Interested in joining Veyro in the future? You can still register your interest and
            we&rsquo;ll let you know when applications reopen.
          </p>
        </div>
        {showSignIn && (
          <p className="mt-5 text-sm text-muted-foreground">
            Already part of Veyro?{" "}
            <Link
              to="/therapist/signin"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in to your therapist account
            </Link>
          </p>
        )}
      </div>

      {status === "success" ? (
        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/10 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-serif text-xl font-semibold text-primary">
            Thank you — you&rsquo;re on the list
          </h3>
          <p className="mt-2 text-sm text-foreground/80">
            We&rsquo;ll be in touch as soon as applications reopen.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-xl space-y-5">
          <h3 className="text-center font-serif text-xl font-semibold text-primary">
            Register your interest
          </h3>
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-medium text-foreground/70">Full name</span>
            <input
              type="text"
              required
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-medium text-foreground/70">Email</span>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-medium text-foreground/70">
              Anything you&rsquo;d like to add (optional)
            </span>
            <textarea
              rows={4}
              placeholder="Your practice, specialisms, or anything else"
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <div className="flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-10 py-4 text-base font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition hover:bg-primary/90 disabled:opacity-70"
            >
              {status === "loading" ? "Submitting…" : "Register my interest"}
            </button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Your information is secure and will never be shared.
            </p>
            <div aria-live="polite" className="min-h-[1.25rem] text-sm">
              {status === "error" && <span className="text-destructive">{errorMsg}</span>}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
