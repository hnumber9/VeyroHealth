import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyBankDetails, saveMyBankDetails } from "@/lib/bank-details.functions";

const empty = {
  account_name: "",
  account_number: "",
  sort_code: "",
  bank_name: "",
  bank_address: "",
};

export function BankDetails() {
  const fetchIt = useServerFn(getMyBankDetails);
  const saveIt = useServerFn(saveMyBankDetails);
  const [f, setF] = useState(empty);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIt({})
      .then(
        (r) =>
          r.details &&
          setF({
            ...empty,
            ...Object.fromEntries(Object.entries(r.details).map(([k, v]) => [k, v ?? ""])),
          }),
      )
      .catch(() => {})
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const e: Record<string, string> = {};
    if (!f.account_name.trim()) e.account_name = "Enter the name on the account.";
    if (!/^\d{8}$/.test(f.account_number.trim()))
      e.account_number = "Account number must be 8 digits.";
    if (!/^\d{6}$/.test(f.sort_code.replace(/[-\s]/g, "")))
      e.sort_code = "Sort code must be 6 digits.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await saveIt({
        data: {
          account_name: f.account_name,
          account_number: f.account_number.trim(),
          sort_code: f.sort_code.replace(/\s/g, ""),
          bank_name: f.bank_name.trim() || null,
          bank_address: f.bank_address.trim() || null,
        },
      });
      toast.success("Bank details saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save bank details.");
    } finally {
      setBusy(false);
    }
  }

  const field = (
    key: keyof typeof empty,
    label: string,
    opts: { placeholder?: string; optional?: boolean; numeric?: boolean } = {},
  ) => (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}{" "}
        {opts.optional && (
          <span className="normal-case tracking-normal text-foreground/40">(optional)</span>
        )}
      </span>
      <input
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        placeholder={opts.placeholder}
        inputMode={opts.numeric ? "numeric" : undefined}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
      {errors[key] && <span className="mt-1 block text-xs text-destructive">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="font-serif text-xl text-foreground">Bank details</h2>
      <p className="mt-2 max-w-xl text-sm text-foreground/70">
        Where Veyro should pay your session earnings. Only you and the Veyro team can see these.
      </p>
      {!loaded ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-foreground/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("account_name", "Name on account")}
            {field("account_number", "Account number", { placeholder: "12345678", numeric: true })}
            {field("sort_code", "Sort code", { placeholder: "12-34-56", numeric: true })}
            {field("bank_name", "Bank name", { optional: true })}
          </div>
          {field("bank_address", "Bank address", { optional: true })}
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save bank details
          </button>
        </div>
      )}
    </div>
  );
}
