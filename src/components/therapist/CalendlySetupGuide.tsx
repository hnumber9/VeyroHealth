import { useState } from "react";
import { ExternalLink, Video } from "lucide-react";

export function CalendlySetupGuide({
  connectButtonLabel = "Connect Calendly",
}: {
  connectButtonLabel?: string;
}) {
  const [open, setOpen] = useState<string | null>("step1");
  const toggle = (id: string) => setOpen((cur) => (cur === id ? null : id));

  const Step = ({
    id,
    num,
    title,
    children,
  }: {
    id: string;
    num: number;
    title: string;
    children: React.ReactNode;
  }) => {
    const isOpen = open === id;
    return (
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <button
          type="button"
          onClick={() => toggle(id)}
          className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-accent/30"
          aria-expanded={isOpen}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {num}
          </span>
          <span className="flex-1 font-serif text-base text-foreground">{title}</span>
          <span className={`text-foreground/40 transition ${isOpen ? "rotate-180" : ""}`}>▾</span>
        </button>
        {isOpen && (
          <div className="border-t border-border/60 bg-secondary/20 px-4 py-4 text-sm text-foreground/80">
            {children}
          </div>
        )}
      </div>
    );
  };

  const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
    >
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  );

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg text-foreground">Step-by-step setup guide</h3>
          <p className="mt-1 text-sm text-foreground/70">
            New to Calendly? Follow these five steps to get your booking page ready. The free plan
            is enough — no paid subscription needed.
          </p>
        </div>
        <Video className="h-6 w-6 shrink-0 text-primary" />
      </div>

      <div className="mt-5 space-y-3">
        <Step id="step1" num={1} title="Create your Calendly account (or use an existing one)">
          <p>
            Go to <Ext href="https://calendly.com/signup">calendly.com/signup</Ext> and create a
            free account. You have three options:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Sign up with Google</strong> — recommended if you use Gmail. Calendly can
              automatically add <strong>Google Meet</strong> links to every booking with no extra
              setup.
            </li>
            <li>
              <strong>Sign up with Microsoft</strong> — recommended if you use Outlook / Office 365.
              Calendly can automatically add <strong>Microsoft Teams</strong> links to every
              booking.
            </li>
            <li>
              <strong>Sign up with email + password</strong> — works fine, but you'll need to
              manually connect a video tool in Step 3, or paste a personal meeting link into each
              event.
            </li>
          </ul>
          <p className="mt-3 text-xs text-foreground/60">
            Tip: use the same email address you'd like clients to see in booking confirmations.
          </p>
        </Step>

        <Step id="step2" num={2} title="Set your weekly availability in Calendly">
          <p>
            This is the block of hours clients will be able to book — Veyro shows exactly what
            Calendly says is free.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              In Calendly, open{" "}
              <Ext href="https://calendly.com/app/availability/schedules">
                Availability → Schedules
              </Ext>
              .
            </li>
            <li>
              Edit your default "Working Hours" schedule — set the days and time ranges you're open
              (e.g. Mon–Fri, 9:00–17:00).
            </li>
            <li>Add any date-specific overrides for holidays or days off.</li>
            <li>
              (Optional) Under <em>Advanced</em>, set buffers between meetings (e.g. 15 min after)
              and minimum notice (e.g. 12h) so clients can't book too close together.
            </li>
          </ol>
        </Step>

        <Step id="step3" num={3} title="Choose your video-conferencing tool">
          <p>Calendly can auto-generate a unique meeting link for every booking. Pick one:</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="font-semibold text-foreground">Google Meet</p>
              <p className="mt-1 text-xs text-foreground/70">
                Auto-linked if you signed up with Google. Otherwise connect a Google Calendar under
                Integrations.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="font-semibold text-foreground">Microsoft Teams</p>
              <p className="mt-1 text-xs text-foreground/70">
                Auto-linked if you signed up with Microsoft. Otherwise connect Office 365 under
                Integrations.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="font-semibold text-foreground">Zoom</p>
              <p className="mt-1 text-xs text-foreground/70">
                Free plan is fine but caps 1:1 calls at 40 min — upgrade or use Meet/Teams instead.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="font-semibold text-foreground">Custom / phone</p>
              <p className="mt-1 text-xs text-foreground/70">
                Also supported: GoTo, Webex, or a fixed personal meeting URL.
              </p>
            </div>
          </div>
          <p className="mt-3">
            To connect one, go to{" "}
            <Ext href="https://calendly.com/integrations">Integrations & apps</Ext> in Calendly and
            enable the tool of your choice.
          </p>
        </Step>

        <Step id="step4" num={4} title="Create an event type for Veyro sessions">
          <p>
            Event types are the bookable "products" clients pick from. You need at least one for
            Veyro.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              Open <Ext href="https://calendly.com/event_types/user/me">Event Types</Ext> and click{" "}
              <strong>+ New Event Type → One-on-One</strong>.
            </li>
            <li>
              <strong>Name it clearly</strong>, e.g. <em>"Veyro Appointment"</em> or{" "}
              <em>"Veyro Therapy Session"</em>. This is what clients see.
            </li>
            <li>
              <strong>Duration:</strong> set the length of a session (50 min is the standard; add a
              second event type for a longer 80 min slot if you offer it).
            </li>
            <li>
              <strong>Location:</strong> choose the video tool you set up in Step 3 (Google Meet,
              Teams, Zoom, etc.) so a fresh link is generated for every booking.
            </li>
            <li>
              <strong>Availability:</strong> attach the schedule from Step 2.
            </li>
            <li>Save. That's the link Veyro will use.</li>
          </ol>
          <p className="mt-3 text-xs text-foreground/60">
            Free-plan note: Calendly allows one active event type on the free tier. That's fine —
            one "Veyro Appointment" event type is all you need.
          </p>
        </Step>

        <Step id="step5" num={5} title={`Come back and click '${connectButtonLabel}'`}>
          <p>
            Once your event type is live, click the <strong>{connectButtonLabel}</strong> button on
            this page. You'll be sent to Calendly to approve the connection — we only read confirmed
            bookings and register a webhook so new appointments appear here instantly.
          </p>
          <p className="mt-3">
            After connecting, use <strong>Preview booking page</strong> to see exactly what clients
            will see.
          </p>
        </Step>
      </div>

      <p className="mt-5 text-xs text-foreground/60">
        Need more help? See Calendly's{" "}
        <Ext href="https://help.calendly.com/hc/en-us/articles/223193448">
          getting-started guide
        </Ext>{" "}
        or email{" "}
        <a
          href="mailto:support@veyrohealth.com"
          className="font-semibold text-primary hover:underline"
        >
          support@veyrohealth.com
        </a>
        .
      </p>
    </div>
  );
}
