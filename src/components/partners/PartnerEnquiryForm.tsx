import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PARTNER_AUDIENCE_SIZES,
  PARTNER_CONSENT,
  PARTNER_INTERESTS,
  PARTNER_ORG_TYPES,
  partnerEnquirySchema,
  readPartnerSource,
  type PartnerSource,
} from "@/lib/partner-enquiry";
import { submitPartnerEnquiry } from "@/lib/partner-enquiry.functions";

const SOURCE_KEY = "veyro-partner-source";
type Errors = Partial<Record<string, string>>;

export function PartnerEnquiryForm() {
  const submit = useServerFn(submitPartnerEnquiry);
  const [organisationName, setOrganisationName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [organisationType, setOrganisationType] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [source, setSource] = useState<PartnerSource>({});
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Keep the first campaign this browser tab arrived with, so later visits to the page don't overwrite it.
  useEffect(() => {
    const current = readPartnerSource(window.location.href, document.referrer);
    try {
      const saved = sessionStorage.getItem(SOURCE_KEY);
      const prev = saved ? (JSON.parse(saved) as PartnerSource) : null;
      const hasCampaign = (s: PartnerSource | null) =>
        !!s && !!(s.utm_source || s.utm_campaign || s.ref || s.referrer);
      const chosen = prev && (hasCampaign(prev) || !hasCampaign(current)) ? prev : current;
      sessionStorage.setItem(SOURCE_KEY, JSON.stringify(chosen));
      setSource(chosen);
    } catch {
      setSource(current);
    }
  }, []);

  const toggleInterest = (v: string) =>
    setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = partnerEnquirySchema.safeParse({
      organisationName,
      contactName,
      email,
      jobTitle,
      organisationType,
      audienceSize,
      interests,
      additionalInfo,
      consent,
      source,
      website,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setFormError("Please check the highlighted fields.");
      const first = parsed.error.issues[0]?.path[0];
      if (first) document.getElementById(`partner-${String(first)}`)?.focus();
      return;
    }
    setErrors({});
    setFormError("");
    setBusy(true);
    try {
      await submit({ data: parsed.data });
      setDone(true);
      if (typeof window !== "undefined") {
        const w = window as unknown as { dataLayer?: unknown[] };
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({
          event: "partner_enquiry_submitted",
          organisation_type: parsed.data.organisationType,
          utm_campaign: source.utm_campaign ?? "",
        });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-border/60 bg-card p-10 text-center shadow-[var(--shadow-soft)]"
      >
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" strokeWidth={1.6} />
        <p className="mt-4 font-serif text-2xl leading-snug text-primary md:text-3xl">
          Thank you for your interest in partnering with Veyro Health. A member of our team will be
          in touch shortly.
        </p>
      </div>
    );
  }

  const field = (key: string) =>
    `mt-1.5 w-full rounded-xl border bg-background px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors[key] ? "border-destructive" : "border-input"}`;
  const label = "block text-sm font-semibold text-primary";
  const err = (key: string) =>
    errors[key] ? <p className="mt-1.5 text-sm text-destructive">{errors[key]}</p> : null;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)] md:p-10"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="partner-organisationName" className={label}>
            Organisation name <span className="text-destructive">*</span>
          </label>
          <input
            id="partner-organisationName"
            autoComplete="organization"
            maxLength={200}
            value={organisationName}
            onChange={(e) => setOrganisationName(e.target.value)}
            className={field("organisationName")}
            aria-invalid={!!errors.organisationName}
          />
          {err("organisationName")}
        </div>
        <div>
          <label htmlFor="partner-contactName" className={label}>
            Contact name <span className="text-destructive">*</span>
          </label>
          <input
            id="partner-contactName"
            autoComplete="name"
            maxLength={200}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={field("contactName")}
            aria-invalid={!!errors.contactName}
          />
          {err("contactName")}
        </div>
        <div>
          <label htmlFor="partner-email" className={label}>
            Work email address <span className="text-destructive">*</span>
          </label>
          <input
            id="partner-email"
            type="email"
            autoComplete="email"
            maxLength={320}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field("email")}
            aria-invalid={!!errors.email}
          />
          {err("email")}
        </div>
        <div>
          <label htmlFor="partner-jobTitle" className={label}>
            Job title <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="partner-jobTitle"
            autoComplete="organization-title"
            maxLength={200}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className={field("jobTitle")}
          />
        </div>
        <div>
          <label htmlFor="partner-organisationType" className={label}>
            Organisation type <span className="text-destructive">*</span>
          </label>
          <select
            id="partner-organisationType"
            value={organisationType}
            onChange={(e) => setOrganisationType(e.target.value)}
            className={field("organisationType")}
            aria-invalid={!!errors.organisationType}
          >
            <option value="">Select…</option>
            {PARTNER_ORG_TYPES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {err("organisationType")}
        </div>
        <div>
          <label htmlFor="partner-audienceSize" className={label}>
            Approximate number of people you could support{" "}
            <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <select
            id="partner-audienceSize"
            value={audienceSize}
            onChange={(e) => setAudienceSize(e.target.value)}
            className={field("audienceSize")}
          >
            <option value="">Select…</option>
            {PARTNER_AUDIENCE_SIZES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className={label}>
          What are you interested in? <span className="text-destructive">*</span>{" "}
          <span className="font-normal text-foreground/50">Choose all that apply.</span>
        </legend>
        <div
          id="partner-interests"
          tabIndex={-1}
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {PARTNER_INTERESTS.map((o) => {
            const on = interests.includes(o);
            return (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${on ? "border-primary bg-accent/50 text-primary" : "border-input text-foreground/80 hover:border-primary/50"}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleInterest(o)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {o}
              </label>
            );
          })}
        </div>
        {err("interests")}
      </fieldset>

      <div className="mt-6">
        <label htmlFor="partner-additionalInfo" className={label}>
          Additional information <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <textarea
          id="partner-additionalInfo"
          rows={4}
          maxLength={3000}
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          className={field("additionalInfo")}
          placeholder="Tell us a little about your organisation and how you'd like to use the platform."
        />
        <p className="mt-1.5 text-xs text-foreground/55">
          Please don't include any patient or personal health information.
        </p>
      </div>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      <div className="mt-6 rounded-2xl bg-secondary/60 p-5 text-sm leading-relaxed text-foreground/75">
        <p className="font-semibold text-primary">Privacy notice</p>
        <p className="mt-1">
          Veyro Health will use the details you provide only to respond to your enquiry and discuss
          a potential partnership. We store your enquiry securely and won't share it with third
          parties for marketing. See our{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline"
          >
            Privacy Policy
          </a>{" "}
          for how we handle your information.
        </p>
        <label className="mt-4 flex items-start gap-3">
          <input
            id="partner-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
            aria-invalid={!!errors.consent}
          />
          <span>
            {PARTNER_CONSENT.replace(" Privacy Policy.", " ")}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline"
            >
              Privacy Policy
            </a>
            . <span className="text-destructive">*</span>
          </span>
        </label>
        {err("consent")}
      </div>

      {formError && (
        <p role="alert" className="mt-5 text-sm font-medium text-destructive">
          {formError}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy}
        className="mt-6 h-auto w-full rounded-xl px-8 py-4 text-base font-semibold md:w-auto"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending…
          </>
        ) : (
          "Register Interest"
        )}
      </Button>
    </form>
  );
}
