import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { getTherapistStatusReport } from "@/lib/admin.functions";
import { THERAPIST_STATUSES } from "@/lib/therapist-status";

type Report = Awaited<ReturnType<typeof getTherapistStatusReport>>;

export function TherapistStatusReport() {
  const fetchReport = useServerFn(getTherapistStatusReport);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      setReport(await fetchReport({}));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the report.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const counts = THERAPIST_STATUSES.map(
    (s) =>
      [s, report?.rows.filter((r: Report["rows"][number]) => r.status === s).length ?? 0] as const,
  );

  const download = async () => {
    if (!report) return;
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const yn = (v: boolean) => (v ? "Yes" : "No");
    const bold = { fontWeight: "bold" as const };
    const summary = [
      [
        { value: "Status", ...bold },
        { value: "Therapists", ...bold },
      ],
      ...counts.map(([s, n]) => [{ value: s }, { value: n, type: Number }]),
      [
        { value: "Total", ...bold },
        { value: report.rows.length, type: Number, ...bold },
      ],
      [],
      [
        { value: "Last updated" },
        {
          value: new Date(report.generatedAt).toLocaleString("en-GB", {
            timeZone: "Europe/London",
          }),
        },
      ],
    ];
    const head = [
      "Name",
      "Email",
      "Profile link",
      "Signed up",
      "Approved",
      "Rejected",
      "Published",
      "Cal.com",
      "Active sessions",
      "Bank details added",
      "Years experience",
      "Status",
    ];
    const list = [
      head.map((h) => ({ value: h, ...bold })),
      ...report.rows.map((r: Report["rows"][number]) => [
        { value: r.name },
        { value: r.email },
        { value: r.link },
        { value: r.signedUp },
        { value: yn(r.approved) },
        { value: yn(r.rejected) },
        { value: yn(r.published) },
        {
          value:
            r.calcom === "connected"
              ? "Connected"
              : r.calcom === "error"
                ? "Needs reconnect"
                : "Not connected",
        },
        { value: r.activeSessions, type: Number },
        { value: yn(r.bank) },
        r.years == null ? null : { value: r.years, type: Number },
        { value: r.status },
      ]),
    ];
    try {
      await (writeXlsxFile as any)([
        { data: summary, sheet: "Summary", columns: [{ width: 36 }, { width: 14 }] },
        {
          data: list,
          sheet: "Therapists",
          columns: [30, 34, 48, 12, 10, 10, 10, 16, 14, 16, 14, 32].map((width) => ({ width })),
        },
      ]).toFile(`veyro-therapists-status-${report.generatedAt.slice(0, 10)}.xlsx`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the Excel file.");
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-foreground">Therapist status report</h2>
          <p className="text-xs text-foreground/60">
            Last updated:{" "}
            {report
              ? new Date(report.generatedAt).toLocaleString("en-GB", {
                  timeZone: "Europe/London",
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "loading…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground/80 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}{" "}
            Update now
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> Download Excel
          </button>
        </div>
      </div>
      {report && (
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {counts.map(([s, n]) => (
            <div key={s} className="rounded-xl border border-border/60 px-3 py-2">
              <p className="text-lg font-semibold text-foreground">{n}</p>
              <p className="text-xs text-foreground/60">{s}</p>
            </div>
          ))}
          <div className="rounded-xl border border-border/60 px-3 py-2">
            <p className="text-lg font-semibold text-foreground">{report.rows.length}</p>
            <p className="text-xs text-foreground/60">Total</p>
          </div>
        </div>
      )}
    </section>
  );
}
