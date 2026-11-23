import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess } from "@/lib/admin.functions";
import { listPartnerEnquiries, updatePartnerEnquiry } from "@/lib/partner-enquiry.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/partners")({
  component: AdminPartners,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Partner enquiries | Veyro Health" },
      {
        name: "description",
        content: "Review and manage partnership enquiries from the Veyro Partners page.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — Partner enquiries | Veyro Health" },
      {
        property: "og:description",
        content: "Review and manage partnership enquiries from the Veyro Partners page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Enquiry = Awaited<ReturnType<typeof listPartnerEnquiries>>["enquiries"][number];
const STATUSES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["closed", "Closed"],
] as const;

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function AdminPartners() {
  const nav = useNavigate();
  const check = useServerFn(getAdminAccess);
  const list = useServerFn(listPartnerEnquiries);
  const update = useServerFn(updatePartnerEnquiry);
  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "closed">("all");
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<
    Record<string, { status: Enquiry["status"]; notes: string }>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => setRows((await list({})).enquiries);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return nav({ to: "/admin/signin", replace: true });
      const { isAdmin } = await check({}).catch(() => ({ isAdmin: false }));
      if (!isAdmin) return setState("denied");
      try {
        await load();
        setState("ready");
      } catch {
        setState("denied");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-foreground/50" />
      </div>
    );
  if (state === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="font-serif text-2xl">Access denied</p>
          <p className="mt-2 text-sm text-foreground/70">
            This area is restricted to Veyro admins.
          </p>
        </div>
      </div>
    );
  }

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!needle) return true;
    return [r.organisation_name, r.contact_name, r.email, r.source_label, r.organisation_type].some(
      (v) => v?.toLowerCase().includes(needle),
    );
  });

  const save = async (r: Enquiry) => {
    const d = drafts[r.id] ?? { status: r.status, notes: r.admin_notes ?? "" };
    setBusyId(r.id);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      await update({
        data: { id: r.id, status: d.status as "new" | "contacted" | "closed", adminNotes: d.notes },
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Saved");
      setDrafts((cur) => {
        const n = { ...cur };
        delete n[r.id];
        return n;
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const header = [
      "Submitted",
      "Organisation",
      "Contact",
      "Job title",
      "Email",
      "Organisation type",
      "Audience size",
      "Interests",
      "Additional information",
      "Source / campaign",
      "UTM source",
      "UTM medium",
      "UTM campaign",
      "Referrer",
      "Landing page",
      "Status",
      "Admin notes",
    ];
    const lines = shown.map((r) =>
      [
        new Date(r.created_at).toISOString(),
        r.organisation_name,
        r.contact_name,
        r.job_title,
        r.email,
        r.organisation_type,
        r.audience_size,
        (r.interests ?? []).join("; "),
        r.additional_info,
        r.source_label,
        r.source.utm_source,
        r.source.utm_medium,
        r.source.utm_campaign,
        r.source.referrer,
        r.source.landing_page,
        r.status,
        r.admin_notes,
      ]
        .map(csvCell)
        .join(","),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\uFEFF" + [header.map(csvCell).join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    a.download = `veyro-partner-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const field =
    "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground";
  const count = (s: string) => rows.filter((r) => r.status === s).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to="/admin"
        search={{ review: undefined }}
        className="text-sm text-foreground/60 underline"
      >
        ← Back to admin
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-primary">Partner enquiries</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Submissions from the{" "}
            <a href="/partners" target="_blank" rel="noreferrer" className="underline">
              Partners page
            </a>
            . Each one is also emailed to support@veyrohealth.com and sam@veyrohealth.com.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!shown.length}>
          <Download className="mr-2 h-4 w-4" />
          Download spreadsheet
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["all", `All (${rows.length})`],
            ...STATUSES.map(([k, l]) => [k, `${l} (${count(k)})`]),
          ] as [typeof filter, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === k ? "bg-primary text-primary-foreground" : "border border-border text-foreground/70"}`}
          >
            {l}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search organisation, name, email or campaign"
          className="ml-auto min-w-[260px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-foreground/60">
          No partner enquiries yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map((r) => {
            const d = drafts[r.id] ?? { status: r.status, notes: r.admin_notes ?? "" };
            const dirty = d.status !== r.status || d.notes !== (r.admin_notes ?? "");
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-primary">{r.organisation_name}</p>
                    <p className="text-sm text-foreground/70">
                      {r.contact_name}
                      {r.job_title ? ` · ${r.job_title}` : ""} ·{" "}
                      <a href={`mailto:${r.email}`} className="underline">
                        {r.email}
                      </a>
                    </p>
                  </div>
                  <div className="text-right text-xs text-foreground/55">
                    <p>
                      {new Date(r.created_at).toLocaleString("en-GB", {
                        timeZone: "Europe/London",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="mt-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-primary">
                      Source: {r.source_label}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-foreground/50">Organisation type</dt>
                    <dd>{r.organisation_type}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Audience size</dt>
                    <dd>{r.audience_size || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Interested in</dt>
                    <dd>{(r.interests ?? []).join(", ")}</dd>
                  </div>
                </dl>
                {r.additional_info && (
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-secondary/50 p-3 text-sm text-foreground/80">
                    {r.additional_info}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                  <label className="text-xs font-semibold text-foreground/60">
                    Status
                    <select
                      value={d.status}
                      onChange={(e) =>
                        setDrafts((c) => ({
                          ...c,
                          [r.id]: { ...d, status: e.target.value as Enquiry["status"] },
                        }))
                      }
                      className={field}
                    >
                      {STATUSES.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-foreground/60">
                    Notes (admin only)
                    <input
                      value={d.notes}
                      maxLength={5000}
                      onChange={(e) =>
                        setDrafts((c) => ({ ...c, [r.id]: { ...d, notes: e.target.value } }))
                      }
                      className={field}
                      placeholder="e.g. Intro call booked 3 Dec"
                    />
                  </label>
                  <Button onClick={() => save(r)} disabled={!dirty || busyId === r.id}>
                    {busyId === r.id ? "Saving…" : "Save"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
