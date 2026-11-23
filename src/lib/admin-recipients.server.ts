import { getRequest } from "@tanstack/react-start/server";
import { isNotificationRecipientExcluded } from "./notification-recipients";

const FALLBACK_ADMIN_EMAIL = "support@veyrohealth.com";

/**
 * Admin inbox used on preview and whenever nothing else resolves.
 * Configured via the PREVIEW_ADMIN_EMAIL server setting.
 */
export function getPreviewAdminEmail(): string {
  return process.env["PREVIEW_ADMIN_EMAIL"]?.trim().toLowerCase() || FALLBACK_ADMIN_EMAIL;
}

/**
 * Hosts that are definitely NOT the live site. Anything else (custom domains,
 * the published lovable.app URL, internal worker hostnames) counts as live so
 * live notifications are never silently narrowed to a single inbox.
 */
function isPreviewHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    host.includes("id-preview") ||
    host.includes("-dev.lovable.app") ||
    host.includes(".lovableproject.com") ||
    host.includes(".sandbox.lovable.dev")
  );
}

/** True unless the request clearly came from a preview/dev build. */
export function isLiveSiteRequest(): boolean {
  try {
    const req = getRequest();
    const host = new URL(req.url).hostname.toLowerCase();
    return !isPreviewHost(host);
  } catch {
    // No request context (cron, background job) — treat as live.
    return true;
  }
}

/**
 * Recipients for therapist admin notifications.
 * Preview/dev: only the PREVIEW_ADMIN_EMAIL inbox.
 * Live site: every user holding the admin role.
 */
export async function getAdminNotificationRecipients(): Promise<string[]> {
  if (!isLiveSiteRequest()) return [getPreviewAdminEmail()];

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const ids = (roles ?? []).map((r) => r.user_id);
    const collected: string[] = [];
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("user_id", ids);
      for (const p of profiles ?? []) if (p.email) collected.push(p.email);
    }
    // Also include the explicit admins table so a missing profile row never
    // silently drops an admin from notifications.
    const { data: adminRows } = await supabaseAdmin.from("admins").select("email");
    for (const a of adminRows ?? []) if (a.email) collected.push(a.email);
    // Shared support inbox always receives admin notifications on live.
    collected.push(FALLBACK_ADMIN_EMAIL);

    const emails = Array.from(
      new Set(
        collected
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e && !isNotificationRecipientExcluded(e)),
      ),
    );
    return emails.length ? emails : [getPreviewAdminEmail()];
  } catch (err) {
    console.error("[admin-recipients] lookup failed", err);
    return [getPreviewAdminEmail()];
  }
}
