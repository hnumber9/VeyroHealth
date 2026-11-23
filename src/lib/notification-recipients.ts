/**
 * Server-only: addresses that must never receive Veyro notification emails.
 * Configured via the NOTIFICATION_EXCLUDED_EMAILS server setting
 * (comma-separated). Account access is independent of these preferences.
 */
export function parseEmailList(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getNotificationExcludedEmails(): string[] {
  const raw =
    typeof process !== "undefined" ? process.env["NOTIFICATION_EXCLUDED_EMAILS"] : undefined;
  return parseEmailList(raw);
}

export function isNotificationRecipientExcluded(
  email: string,
  excluded: string[] = getNotificationExcludedEmails(),
): boolean {
  return excluded.includes(email.trim().toLowerCase());
}
