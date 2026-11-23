import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle, ShieldCheck, ExternalLink, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TherapistStatusReport } from "@/components/admin/TherapistStatusReport";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getAdminAccess,
  listTherapistsForAdmin,
  approveTherapistProfile,
  rejectTherapistProfile,
  setTherapistProfileVisibility,
  listTherapistAppointmentsForAdmin,
  listClientAppointmentsForAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    review: typeof search.review === "string" ? search.review : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Admin — therapist approvals | Veyro Health" },
      {
        name: "description",
        content: "Internal Veyro admin area for reviewing and approving therapist profiles.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — therapist approvals | Veyro Health" },
      {
        property: "og:description",
        content: "Internal Veyro admin area for reviewing and approving therapist profiles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Therapist = Awaited<ReturnType<typeof listTherapistsForAdmin>>["therapists"][number];

function AdminPage() {
  const nav = useNavigate();
  const { review } = Route.useSearch();
  const checkAccess = useServerFn(getAdminAccess);
  const fetchList = useServerFn(listTherapistsForAdmin);
  const approve = useServerFn(approveTherapistProfile);
  const reject = useServerFn(rejectTherapistProfile);
  const setVisibility = useServerFn(setTherapistProfileVisibility);

  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [rows, setRows] = useState<Therapist[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState<"approvals" | "therapists" | "clients">("approvals");

  useEffect(() => {
    if (state !== "ready" || !review) return;
    const el = document.getElementById(`therapist-${review}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state, review, rows]);

  const load = async () => {
    const { therapists } = await fetchList({});
    setRows(therapists);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!s.session) {
        nav({ to: "/admin/signin", replace: true });
        return;
      }
      try {
        const { isAdmin } = await checkAccess({});
        if (cancelled) return;
        if (!isAdmin) {
          setState("denied");
          return;
        }
        await load();
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApprove = async (t: Therapist) => {
    setBusyId(t.id);
    try {
      await approve({ data: { id: t.id }, headers: await actionHeaders() });
      toast.success(`${t.display_name} approved and notified`);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't approve that profile. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const onReject = (t: Therapist) => {
    setRejectingId(t.id);
    setReason("");
  };

  const actionHeaders = async () => {
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) {
      throw new Error(
        "Your session has expired. Please sign in again before changing this profile.",
      );
    }
    return { Authorization: `Bearer ${token}` };
  };

  const onVisibilityChange = async (t: Therapist, published: boolean) => {
    setBusyId(t.id);
    try {
      await setVisibility({ data: { id: t.id, published }, headers: await actionHeaders() });
      toast.success(`${t.display_name} ${published ? "shown" : "hidden"}`);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't change profile visibility. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async (t: Therapist) => {
    const text = reason.trim();
    if (text.length < 3) {
      toast.error("Please add a short reason (at least 3 characters).");
      return;
    }
    setBusyId(t.id);
    try {
      await reject({ data: { id: t.id, reason: text }, headers: await actionHeaders() });
      toast.success(`${t.display_name} moved to Rejected`);
      setRejectingId(null);
      setReason("");
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't update that profile. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (state === "loading") {
    return (
      <Shell bare>
        <p className="text-sm text-foreground/60">Loading…</p>
      </Shell>
    );
  }
  if (state === "denied") {
    return (
      <Shell bare>
        <div className="rounded-3xl border border-border/60 bg-card p-8">
          <h2 className="font-serif text-2xl text-foreground">Admins only</h2>
          <p className="mt-2 text-sm text-foreground/70">
            This area is restricted to Veyro admins.
          </p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  const pending = rows.filter((r) => !r.approved_at && !r.published && !r.rejected_at);
  const approved = rows.filter((r) => !r.rejected_at && (r.approved_at || r.published));
  const rejected = rows.filter((r) => r.rejected_at);

  const rowProps = (t: Therapist) => ({
    busy: busyId === t.id,
    highlight: t.id === review,
    rejectOpen: rejectingId === t.id,
    reason,
    onReasonChange: setReason,
    onSubmitReject: submitReject,
    onCancelReject: () => {
      setRejectingId(null);
      setReason("");
    },
  });

  return (
    <Shell>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["approvals", "Therapist approvals"],
            ["therapists", "Therapists"],
            ["clients", "Clients"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground/70"
            }`}
          >
            {label}
          </button>
        ))}
        <Link
          to="/admin/seo"
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground/70"
        >
          SEO pages
        </Link>
        <Link
          to="/admin/partners"
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground/70"
        >
          Partner enquiries
        </Link>
      </div>

      <TherapistStatusReport />

      {tab === "therapists" && <TherapistAppointmentsSection />}
      {tab === "clients" && <ClientAppointmentsSection />}

      {tab === "approvals" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Awaiting review" value={pending.length} icon={Clock} />
            <Stat label="Approved" value={approved.length} icon={CheckCircle2} />
            <Stat label="Rejected" value={rejected.length} icon={XCircle} />
          </div>

          <Group
            defaultOpen
            title="Awaiting review"
            empty="Nothing waiting — you're all caught up."
          >
            {pending.map((t) => (
              <Row key={t.id} t={t} {...rowProps(t)} onApprove={onApprove} onReject={onReject} />
            ))}
          </Group>
          <Group title="Rejected" empty="No rejected therapists.">
            {rejected.map((t) => (
              <Row
                key={t.id}
                t={t}
                {...rowProps(t)}
                onApprove={onApprove}
                approveLabel="Approve instead"
              />
            ))}
          </Group>
          <Group title="Approved" empty="No approved therapists yet.">
            {approved.map((t) => (
              <Row
                key={t.id}
                t={t}
                {...rowProps(t)}
                onReject={onReject}
                onVisibilityChange={onVisibilityChange}
              />
            ))}
          </Group>
        </>
      )}
    </Shell>
  );
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(cents: number | null, currency: string | null) {
  if (typeof cents !== "number") return "—";
  const symbol = (currency ?? "gbp").toLowerCase() === "gbp" ? "£" : "";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function AppointmentList({
  items,
  showTherapist,
}: {
  items: Array<{
    id: string;
    starts_at: string;
    status: string;
    payment_status: string | null;
    price_cents: number | null;
    currency: string | null;
    service_name: string | null;
    client_email?: string;
    client_name?: string | null;
    therapist_name?: string | null;
  }>;
  showTherapist?: boolean;
}) {
  if (!items.length) {
    return <p className="text-sm text-foreground/60">No appointments yet.</p>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {items.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="text-foreground">
              {fmtWhen(a.starts_at)}
              <span className="text-foreground/60">
                {" with "}
                {showTherapist ? (a.therapist_name ?? "—") : a.client_name || a.client_email || "—"}
              </span>
            </p>
            <p className="text-xs text-foreground/60">
              {a.service_name ?? "Session"}
              {showTherapist
                ? ` · ${a.therapist_name ?? "—"}`
                : a.client_email
                  ? ` · ${a.client_email}`
                  : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs">
            <span className="rounded-full border border-border px-2 py-0.5 capitalize text-foreground/70">
              {a.status}
            </span>
            <span className="text-foreground/70 capitalize">{a.payment_status ?? "—"}</span>
            <span className="font-semibold text-foreground">
              {fmtMoney(a.price_cents, a.currency)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

type ApptLike = { starts_at: string; status: string };

function summarise(items: ApptLike[]) {
  const now = Date.now();
  let scheduled = 0;
  let completed = 0;
  let cancelled = 0;
  for (const a of items) {
    const status = (a.status ?? "").toLowerCase();
    if (status === "cancelled" || status === "canceled" || status === "refunded") {
      cancelled += 1;
    } else if (new Date(a.starts_at).getTime() > now) {
      scheduled += 1;
    } else {
      completed += 1;
    }
  }
  return { total: items.length, scheduled, completed, cancelled };
}

function CountPills({ items }: { items: ApptLike[] }) {
  const s = summarise(items);
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      {(
        [
          ["Total", s.total],
          ["Scheduled", s.scheduled],
          ["Completed", s.completed],
          ["Cancelled", s.cancelled],
        ] as const
      ).map(([label, value]) => (
        <span
          key={label}
          className="rounded-full border border-border px-2 py-0.5 text-foreground/70"
        >
          {label}: <span className="font-semibold text-foreground">{value}</span>
        </span>
      ))}
    </div>
  );
}

function TherapistAppointmentsSection() {
  const fetchData = useServerFn(listTherapistAppointmentsForAdmin);
  type Row = Awaited<ReturnType<typeof listTherapistAppointmentsForAdmin>>["therapists"][number];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bankFilter, setBankFilter] = useState<"all" | "added" | "missing">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchData({})
      .then((r) => {
        if (!cancelled) setRows(r.therapists);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) return <p className="text-sm text-foreground/60">Loading therapists…</p>;

  const shown = rows.filter(
    (t) =>
      (bankFilter === "all" ? true : bankFilter === "added" ? !!t.bank_details : !t.bank_details) &&
      (!query.trim() ||
        `${t.display_name} ${t.email ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const downloadCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = [
      "Therapist",
      "Email",
      "Live",
      "Bank details added",
      "Name on account",
      "Account number",
      "Sort code",
      "Bank name",
      "Bank address",
    ];
    const lines = shown.map((t) =>
      [
        t.display_name,
        t.email,
        t.published ? "Yes" : "No",
        t.bank_details ? "Yes" : "No",
        t.bank_details?.account_name,
        t.bank_details?.account_number,
        t.bank_details?.sort_code,
        t.bank_details?.bank_name,
        t.bank_details?.bank_address,
      ]
        .map(esc)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + [header.map(esc).join(","), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veyro-bank-details-${bankFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-foreground">Therapists</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            aria-label="Search therapists"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value as typeof bankFilter)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            aria-label="Filter by bank details"
          >
            <option value="all">All therapists ({rows.length})</option>
            <option value="added">
              Bank details added ({rows.filter((t) => t.bank_details).length})
            </option>
            <option value="missing">
              Bank details not added ({rows.filter((t) => !t.bank_details).length})
            </option>
          </select>
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Download spreadsheet
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {shown.length === 0 && <p className="text-sm text-foreground/60">No therapists match.</p>}
        {shown.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{t.display_name}</p>
                <p className="text-xs text-foreground/60">
                  {t.email ?? "no email on file"}
                  {t.location ? ` · ${t.location}` : ""}
                </p>
                <p className="mt-1 text-xs text-foreground/60">
                  {t.published ? "Live" : "Not published"}
                </p>
                <CountPills items={t.appointments} />
              </div>
              <button
                type="button"
                onClick={() => setOpenId((v) => (v === t.id ? null : t.id))}
                className="flex items-center gap-1 text-xs font-semibold text-primary"
              >
                {openId === t.id ? "Hide details" : "View details"}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${openId === t.id ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            {openId === t.id && (
              <div className="mt-4 space-y-4 border-t border-border/60 pt-3">
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bank details
                  </div>
                  {t.bank_details ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Name on account" value={t.bank_details.account_name} />
                      <Field label="Account number" value={t.bank_details.account_number} />
                      <Field label="Sort code" value={t.bank_details.sort_code} />
                      <Field label="Bank name" value={t.bank_details.bank_name} />
                      <Field label="Bank address" value={t.bank_details.bank_address} />
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/60">Not added yet.</p>
                  )}
                </div>
                <AppointmentList items={t.appointments} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ClientAppointmentsSection() {
  const fetchData = useServerFn(listClientAppointmentsForAdmin);
  type Row = Awaited<ReturnType<typeof listClientAppointmentsForAdmin>>["clients"][number];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "sessions">("newest");

  useEffect(() => {
    let cancelled = false;
    fetchData({})
      .then((r) => {
        if (!cancelled) setRows(r.clients);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) return <p className="text-sm text-foreground/60">Loading clients…</p>;

  const joinedTs = (c: Row) => (c.joined_at ? new Date(c.joined_at).getTime() : null);
  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "sessions") return b.appointments.length - a.appointments.length;
    const ta = joinedTs(a),
      tb = joinedTs(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return sortBy === "newest" ? tb - ta : ta - tb;
  });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-foreground">Clients</h2>
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="newest">Signed up (newest first)</option>
            <option value="oldest">Signed up (oldest first)</option>
            <option value="sessions">Most sessions</option>
          </select>
        </label>
      </div>
      <div className="mt-3 space-y-3">
        {rows.length === 0 && <p className="text-sm text-foreground/60">No clients yet.</p>}
        {sorted.map((c) => (
          <div key={c.email} className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{c.name ?? c.email}</p>
                <p className="text-xs text-foreground/60">{c.email}</p>
                <p className="mt-1 text-xs text-foreground/60">
                  {c.joined_at
                    ? `Joined ${new Date(c.joined_at).toLocaleDateString("en-GB")}`
                    : "No account yet"}
                </p>
                <CountPills items={c.appointments} />
              </div>
              <button
                type="button"
                onClick={() => setOpenEmail((v) => (v === c.email ? null : c.email))}
                className="flex items-center gap-1 text-xs font-semibold text-primary"
              >
                {openEmail === c.email ? "Hide appointments" : "View appointments"}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${openEmail === c.email ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            {openEmail === c.email && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <AppointmentList items={c.appointments} showTherapist />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Shell({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[1000px] px-6 py-12">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">
          <ShieldCheck className="h-4 w-4" /> Veyro admin
        </div>
        {!bare && (
          <h1 className="mt-2 font-serif text-3xl text-foreground md:text-4xl">
            Therapist approvals
          </h1>
        )}
        <div className="mt-8 space-y-8">{children}</div>
      </main>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Clock }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground/60">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 font-serif text-3xl text-foreground">{value}</p>
    </div>
  );
}

function Group({
  title,
  empty,
  children,
  defaultOpen = false,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  const hasItems = items.length > 0;
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-border bg-card p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-xl text-foreground">
        <span>
          {title} <span className="text-base text-foreground/60">({items.length})</span>
        </span>
        <span className="text-sm text-foreground/60 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3 space-y-3">
        {hasItems ? children : <p className="text-sm text-foreground/60">{empty}</p>}
      </div>
    </details>
  );
}

function Row({
  t,
  busy,
  highlight,
  onApprove,
  onReject,
  approveLabel,
  onVisibilityChange,
  rejectOpen,
  reason,
  onReasonChange,
  onSubmitReject,
  onCancelReject,
}: {
  t: Therapist;
  busy: boolean;
  highlight?: boolean;
  onApprove?: (t: Therapist) => void;
  onReject?: (t: Therapist) => void;
  onVisibilityChange?: (t: Therapist, published: boolean) => void;
  approveLabel?: string;
  rejectOpen?: boolean;
  reason?: string;
  onReasonChange?: (v: string) => void;
  onSubmitReject?: (t: Therapist) => void;
  onCancelReject?: () => void;
}) {
  const [open, setOpen] = useState(highlight ?? false);
  return (
    <div
      id={`therapist-${t.id}`}
      className={`rounded-2xl border bg-card p-5 ${highlight ? "border-primary ring-2 ring-primary/30" : "border-border/60"}`}
    >
      {highlight && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
          From your email notification
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{t.display_name}</p>
          <p className="text-sm text-foreground/70">
            {t.title ?? "—"}
            {t.location ? ` · ${t.location}` : ""}
          </p>
          <p className="mt-1 text-xs text-foreground/60">{t.email ?? "no email on file"}</p>
          {t.qualifications && (
            <p className="mt-2 text-sm text-foreground/70">{t.qualifications}</p>
          )}
          {t.rejection_reason && (
            <p className="mt-2 text-sm text-destructive">Rejected: {t.rejection_reason}</p>
          )}
          {t.slug && t.published && (
            <a
              href={`/therapist/${t.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              View live profile <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary"
          >
            {open ? "Hide full application" : "View full application"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onVisibilityChange && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Switch
                checked={t.published}
                disabled={busy}
                aria-label={`Show profile for ${t.display_name}`}
                onCheckedChange={(published) => onVisibilityChange(t, published)}
              />
              {t.published ? "Shown" : "Hidden"}
            </label>
          )}
          {onApprove && (
            <button
              disabled={busy}
              onClick={() => onApprove(t)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Working…" : (approveLabel ?? "Approve")}
            </button>
          )}
          {onReject && !rejectOpen && (
            <Button variant="outline" disabled={busy} onClick={() => onReject(t)}>
              Reject
            </Button>
          )}
        </div>
      </div>
      {rejectOpen && (
        <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
          <label className="text-sm font-semibold text-foreground">
            Why are you rejecting {t.display_name}?
          </label>
          <textarea
            autoFocus
            rows={3}
            value={reason ?? ""}
            onChange={(e) => onReasonChange?.(e.target.value)}
            placeholder="Shared with the Veyro team only."
            className="mt-2 w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground"
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              type="button"
              disabled={busy}
              onClick={() => onSubmitReject?.(t)}
            >
              {busy ? "Working…" : "Confirm rejection"}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => onCancelReject?.()}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {open && <Details t={t} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
        {label}
      </p>
      <div className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/80">{value || "—"}</div>
    </div>
  );
}

function Details({ t }: { t: Therapist }) {
  const any = t as Record<string, any>;
  const list = (v: unknown) => (Array.isArray(v) && v.length ? v.join(", ") : "");
  const money = (cents: unknown) =>
    typeof cents === "number" ? `£${(cents / 100).toFixed(2)}` : "";
  return (
    <div className="mt-5 border-t border-border/60 pt-5">
      {any.photo_url && (
        <img
          src={any.photo_url}
          alt={`${t.display_name} profile photo`}
          className="mb-4 h-24 w-24 rounded-2xl object-cover"
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" value={any.display_name} />
        <Field label="Email" value={any.email} />
        <Field label="Title" value={any.title} />
        <Field label="Years in practice" value={any.years_in_practice} />
        <Field label="Profile URL slug" value={any.slug} />
        <Field label="Qualifications" value={any.qualifications} />
        <Field label="Languages" value={list(any.languages)} />
        <Field label="Areas of expertise" value={list(any.specialties)} />
        <Field label="Insurance providers" value={list(any.insurance_providers)} />
        <Field label="Offers intro call" value={any.offers_intro_call ? "Yes" : "No"} />
        <Field
          label="Session price"
          value={any.session_fee_50 ? `£${any.session_fee_50}` : money(any.session_price_cents)}
        />
        <Field
          label="Submitted"
          value={any.created_at ? new Date(any.created_at).toLocaleString() : ""}
        />
        <Field
          label="Last updated"
          value={any.updated_at ? new Date(any.updated_at).toLocaleString() : ""}
        />
      </div>
      <div className="mt-4 space-y-4">
        <Field label="Bio" value={any.bio} />
      </div>
      <div className="mt-5 rounded-xl border border-border/60 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bank details
        </div>
        {any.bank_details ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name on account" value={any.bank_details.account_name} />
            <Field label="Account number" value={any.bank_details.account_number} />
            <Field label="Sort code" value={any.bank_details.sort_code} />
            <Field label="Bank name" value={any.bank_details.bank_name} />
            <Field label="Bank address" value={any.bank_details.bank_address} />
          </div>
        ) : (
          <p className="text-sm text-foreground/60">Not added yet.</p>
        )}
      </div>
      {any.intro_video_url && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Intro video</div>
          <video
            controls
            preload="metadata"
            playsInline
            src={any.intro_video_url}
            className="mt-2 w-full max-w-xl rounded-2xl border border-border/60 bg-muted"
          />
        </div>
      )}
    </div>
  );
}
