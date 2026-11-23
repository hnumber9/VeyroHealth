import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MATCHING_AGES,
  MATCHING_CONSENT,
  MATCHING_DELAY_MS,
  MATCHING_GENDERS,
  matchingEnquirySchema,
} from "@/lib/matching-enquiry";
import { submitMatchingEnquiry } from "@/lib/matching-enquiry.functions";

export function MatchingEnquiryPopup() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [notified, setNotified] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [helpWith, setHelpWith] = useState("");
  const [gender, setGender] = useState<string>("No preference");
  const [age, setAge] = useState<string>("No preference");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const submit = useServerFn(submitMatchingEnquiry);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("veyro-matching-dismissed")) return;
    } catch {
      /* Storage may be blocked. */
    }
    const timer = window.setTimeout(() => {
      if (!document.querySelector('[role="dialog"]') && document.visibilityState === "visible")
        setOpen(true);
    }, MATCHING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  function changeOpen(value: boolean) {
    if (busy) return;
    setOpen(value);
    if (!value) {
      try {
        sessionStorage.setItem("veyro-matching-dismissed", "yes");
      } catch {
        /* No personal information is stored. */
      }
    }
  }
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = matchingEnquirySchema.safeParse({
      email,
      helpWith,
      gender,
      age,
      consent,
      website,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await submit({ data: parsed.data });
      setNotified(result.notified);
      setComplete(true);
      setEmail("");
      setHelpWith("");
      try {
        sessionStorage.setItem("veyro-matching-dismissed", "yes");
      } catch {
        /* Optional session flag. */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const field =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg p-6">
        {complete ? (
          <>
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <DialogTitle>Thank you — your request is saved</DialogTitle>
            <DialogDescription>
              {notified
                ? "The Veyro team will review your preferences and contact you by email."
                : "Your request is saved, but the email notification could not be sent. Please contact support@veyrohealth.com to follow up."}
            </DialogDescription>
            <Button onClick={() => changeOpen(false)}>Done</Button>
          </>
        ) : (
          <>
            <DialogHeader className="pr-6 text-left">
              <DialogTitle className="font-serif text-2xl leading-tight">
                Feeling overwhelmed by the choice?
              </DialogTitle>
              <DialogDescription className="mt-2 leading-relaxed">
                Tell us what you’re looking for and we’ll match you with a few therapists offering a
                free first session.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <label className="block text-sm font-medium">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={320}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block text-sm font-medium">
                What would you like help with?
                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  value={helpWith}
                  onChange={(e) => setHelpWith(e.target.value)}
                  className={field}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Preferred therapist gender
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={field}
                  >
                    {MATCHING_GENDERS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Preferred therapist age range
                  <select value={age} onChange={(e) => setAge(e.target.value)} className={field}>
                    {MATCHING_AGES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
              <input
                aria-label="Website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <label className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  {MATCHING_CONSENT.slice(0, -"Privacy Policy.".length)}
                  <a
                    href="https://veyrohealth.com/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={busy}
                className="h-auto min-h-11 w-full whitespace-normal py-3"
              >
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" /> Sending…
                  </>
                ) : (
                  "Help me find a therapist"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
