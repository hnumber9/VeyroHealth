import { useState } from "react";
import { CalendarClock, ChevronDown, AlertCircle } from "lucide-react";

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Connect Cal.com",
    body: (
      <>
        Hit <strong>Continue with Cal.com</strong> below — it takes you to Cal.com where you sign up
        (or sign in). If you&apos;re signing up, choose the <strong>Personal</strong> (free) plan —
        not a team or organisation plan — add your details, and connect your calendar or choose{" "}
        <strong>skip for now</strong>. At the end, click <strong>Allow</strong> /{" "}
        <strong>Approve</strong> so Veyro can see your session types and availability.
      </>
    ),
  },
  {
    title: "Create one link per session you offer",
    body: (
      <>
        In Cal.com go to <strong>Links</strong> (top of the left sidebar — not &ldquo;Events&rdquo;,
        which is a different feature) → <strong>New</strong>, and add one for each session length,
        e.g. &ldquo;50-minute therapy session&rdquo; and &ldquo;15-minute intro call&rdquo;. Set the
        duration only — leave Cal.com payments off, you&apos;ll price them on Veyro.
      </>
    ),
  },
  {
    title: "Create a named schedule first",
    body: (
      <>
        In Cal.com, click <strong>Availability</strong> in the left-hand menu. You&apos;ll already
        have one called <strong>Working Hours</strong>. Open it, set the days and times you see
        clients, check the <strong>timezone</strong> at the bottom is correct, then click{" "}
        <strong>Save</strong> in the top right. Nothing saves until you press that Save button —
        this is the single most common reason hours seem to disappear.
      </>
    ),
  },
  {
    title: "Add a second schedule only if your sessions differ",
    body: (
      <>
        If, say, your intro calls are only on Monday mornings, go to <strong>Availability</strong> →{" "}
        <strong>+ New</strong>, give it a clear name like &ldquo;Intro calls only&rdquo;, set those
        hours and save. Otherwise skip this — one schedule for everything is simpler.
      </>
    ),
  },
  {
    title: "Point each session at a schedule",
    body: (
      <>
        This is the step that catches most people. Go to <strong>Links</strong> (top of the left
        sidebar — not &ldquo;Events&rdquo;, which is a different feature), open a session (e.g.
        &ldquo;50-minute therapy session&rdquo;), click the <strong>Availability</strong> tab inside
        it, and pick your schedule from the dropdown. Press <strong>Save</strong>. Repeat for every
        session type — each one has its own setting, so changing hours in one does not change the
        others.
      </>
    ),
  },
  {
    title: "Check the limits that hide slots",
    body: (
      <>
        Still in the session type, open <strong>Limits</strong>. <strong>Minimum notice</strong>{" "}
        controls how far ahead someone must book — if it&apos;s set to 120 minutes, today&apos;s and
        tomorrow&apos;s early slots won&apos;t show. Also check{" "}
        <strong>Calendar for availability</strong> / buffers here if whole days look blocked.
      </>
    ),
  },
  {
    title: "Confirm it looks right to a client",
    body: (
      <>
        Open your Cal.com booking link in a new tab (Links → the link icon). What you see there is
        exactly what patients see on Veyro. Then come back to <strong>Meeting settings</strong> here
        and press <strong>Refresh</strong> so Veyro pulls the latest version through.
      </>
    ),
  },
  {
    title: "Set your prices on Veyro",
    body: (
      <>
        Back in <strong>Meeting settings</strong>, your session types appear in{" "}
        <strong>Your sessions &amp; prices</strong>. Add a price for each one and save. Clients pay
        when they book and the session lands in your calendar.
      </>
    ),
  },
];

const FIXES: { problem: string; fix: React.ReactNode }[] = [
  {
    problem: "My hours won't save",
    fix: (
      <>
        You&apos;re almost certainly editing the schedule but not pressing <strong>Save</strong> in
        the top right corner, or you&apos;re editing hours inside an event type before a schedule
        has been selected there. Save the schedule under <strong>Availability</strong> first, then
        select it in the event type.
      </>
    ),
  },
  {
    problem: "One session shows the right hours, another doesn't",
    fix: (
      <>
        Each session type points at its own schedule. Open the one that&apos;s wrong →{" "}
        <strong>Availability</strong> tab → pick the correct schedule → Save.
      </>
    ),
  },
  {
    problem: "Today or tomorrow has no slots",
    fix: (
      <>
        That&apos;s <strong>Minimum notice</strong> under <strong>Limits</strong> in the event type.
        Lower it if you&apos;re happy with shorter-notice bookings.
      </>
    ),
  },
  {
    problem: "Only one or two times show when a client reschedules",
    fix: (
      <>
        Go to <strong>Links</strong> → click the session type → <strong>Limits</strong> tab. Two
        settings control this: <strong>Minimum notice</strong> (at 120 minutes it hides anything
        sooner than 2 hours away) and the <strong>buffer before/after event</strong> settings, which
        block out gaps around existing bookings. Lower them and more times will appear.
      </>
    ),
  },
  {
    problem: "Intro call slots show every 15 minutes all day",
    fix: (
      <>
        1. <strong>Availability</strong> → <strong>New schedule</strong> → call it &ldquo;Intro
        calls&rdquo; and set only the windows you want (e.g. Tuesday and Thursday 12–2), then Save.
        <br />
        2. <strong>Links</strong> → your 15-min intro call → <strong>Availability</strong> tab →
        switch the dropdown from your working hours to &ldquo;Intro calls&rdquo; and Save.
        <br />
        Intro calls can then only be booked in those windows.
      </>
    ),
  },
  {
    problem: "Times show as free when I'm busy with clients or blocked in my calendar",
    fix: (
      <>
        Cal.com hides clashing times once a session is booked through it, but it can&apos;t see
        regular clients who haven&apos;t booked ahead. Either block that time in your schedule, or
        connect your own calendar: <strong>Settings</strong> (bottom left) →{" "}
        <strong>Calendars</strong> → connect Google or Outlook, and turn on{" "}
        <strong>Check for conflicts</strong> for that calendar. Blocks must be set to{" "}
        <strong>Busy</strong> — events marked Free or Tentative (often the default for all-day
        events) are ignored.
      </>
    ),
  },
  {
    problem: "Everything looks right on Cal.com but not on Veyro",
    fix: (
      <>
        Press <strong>Refresh</strong> in <strong>Meeting settings</strong>. If it still differs,
        your connection may need renewing — press <strong>Connect Cal.com</strong> once and approve
        again.
      </>
    ),
  },
];

export function CalcomAvailabilityGuide({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <span className="font-serif text-base text-foreground">
            How to set up your calendar — step by step
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground/50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/70">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertCircle className="h-4 w-4 text-primary" /> If something isn&apos;t working
            </p>
            <dl className="space-y-3">
              {FIXES.map((f) => (
                <div key={f.problem}>
                  <dt className="text-sm font-medium text-foreground/90">{f.problem}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-foreground/70">{f.fix}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}
    </div>
  );
}
