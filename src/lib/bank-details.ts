// Central Veyro Health bank details for booking payment instructions.
// Update here if the account changes; every email references these values.

export const BANK_DETAILS = {
  accountName: "VEYRO HEALTH LTD",
  sortCode: "23-01-63",
  accountNumber: "90399931",
} as const;

/**
 * Build the payment reference clients should quote on their bank transfer.
 * Keeps it short, alphanumeric, and identifiable so finance can reconcile.
 */
export function buildPaymentReference(clientName?: string | null): string {
  const cleaned = (clientName ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .join(" ");
  const name = cleaned.length ? cleaned.slice(0, 18) : "CLIENT";
  return `VEYRO ${name}`;
}
