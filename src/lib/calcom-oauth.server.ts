/**
 * Cal.com OAuth ("Continue with Cal.com") — server only.
 *
 * Therapists authorise Veyro against their own free Cal.com account instead of
 * pasting an API key. Access tokens live 30 minutes, so every read of a
 * connection refreshes the token when it is close to expiry.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const CALCOM_AUTHORIZE_URL = "https://app.cal.com/auth/oauth2/authorize";
export const CALCOM_TOKEN_URL = "https://api.cal.com/v2/auth/oauth2/token";

/** User-level scopes granted to the Veyro OAuth client. */
export const CALCOM_SCOPES = [
  "PROFILE_READ",
  "EVENT_TYPE_READ",
  "EVENT_TYPE_WRITE",
  "BOOKING_READ",
  "BOOKING_WRITE",
  "SCHEDULE_READ",
  "SCHEDULE_WRITE",
  "APPS_READ",
  "APPS_WRITE",
  "WEBHOOK_READ",
  "WEBHOOK_WRITE",
] as const;

const ALLOWED_ORIGIN_SUFFIXES = [
  "veyrohealth.com",
  "lovable.app",
  "lovable.dev",
  "lovableproject.com",
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function isCalcomOAuthConfigured(): boolean {
  return Boolean(
    process.env["CALCOM_OAUTH_CLIENT_ID"] && process.env["CALCOM_OAUTH_CLIENT_SECRET"],
  );
}

export function getCalcomSiteOrigin(): string {
  return process.env["CALCOM_REDIRECT_ORIGIN"] || "https://veyrohealth.com";
}

export function getCalcomRedirectUri(): string {
  return `${getCalcomSiteOrigin()}/therapist/calcom/callback`;
}

export function isAllowedReturnOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return ALLOWED_ORIGIN_SUFFIXES.some(
      (s) => url.hostname === s || url.hostname.endsWith(`.${s}`),
    );
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Signed state (CSRF + links the callback back to one therapist)
// -----------------------------------------------------------------------------

function stateSecret(): string {
  return requireEnv("CALCOM_OAUTH_STATE_SECRET");
}

export function signCalcomState(
  userId: string,
  returnOrigin?: string | null,
  ttlSeconds = 600,
): string {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const originB64 = returnOrigin ? Buffer.from(returnOrigin, "utf8").toString("base64url") : "";
  const payload = `${userId}.${expiry}.${originB64}`;
  return `${payload}.${createHmac("sha256", stateSecret()).update(payload).digest("hex")}`;
}

export function verifyCalcomState(
  state: string,
): { userId: string; returnOrigin: string | null } | null {
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [userId, expiryStr, originB64, sig] = parts;
  const expiry = Number(expiryStr);
  if (!userId || !Number.isFinite(expiry)) return null;
  if (Math.floor(Date.now() / 1000) > expiry) return null;
  const expected = createHmac("sha256", stateSecret())
    .update(`${userId}.${expiry}.${originB64}`)
    .digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let returnOrigin: string | null = null;
  if (originB64) {
    try {
      const decoded = Buffer.from(originB64, "base64url").toString("utf8");
      if (isAllowedReturnOrigin(decoded)) returnOrigin = decoded;
    } catch {
      returnOrigin = null;
    }
  }
  return { userId, returnOrigin };
}

export function buildCalcomAuthorizeUrl(state: string, redirectUri?: string): string {
  const url = new URL(CALCOM_AUTHORIZE_URL);
  url.searchParams.set("client_id", requireEnv("CALCOM_OAUTH_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri || getCalcomRedirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", CALCOM_SCOPES.join(" "));
  return url.toString();
}

// -----------------------------------------------------------------------------
// Token endpoint
// -----------------------------------------------------------------------------

export type CalcomTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<CalcomTokens> {
  const res = await fetch(CALCOM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }
  const payload = ((parsed as { data?: Record<string, unknown> }).data ?? parsed) as Record<
    string,
    unknown
  >;
  if (!res.ok || typeof payload["access_token"] !== "string") {
    const detail =
      (payload["error_description"] as string) ??
      (payload["error"] as string) ??
      text.slice(0, 200);
    console.error(`[calcom:oauth] token request failed [${res.status}]: ${text.slice(0, 400)}`);
    throw new Error(detail || `Cal.com token request failed (${res.status})`);
  }
  return {
    access_token: payload["access_token"] as string,
    refresh_token: (payload["refresh_token"] as string) ?? "",
    expires_in: Number(payload["expires_in"] ?? 1800),
    scope: payload["scope"] as string | undefined,
  };
}

export function exchangeCalcomCode(code: string, redirectUri?: string): Promise<CalcomTokens> {
  return tokenRequest({
    client_id: requireEnv("CALCOM_OAUTH_CLIENT_ID"),
    client_secret: requireEnv("CALCOM_OAUTH_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri || getCalcomRedirectUri(),
  });
}

export function refreshCalcomTokens(refreshToken: string): Promise<CalcomTokens> {
  return tokenRequest({
    client_id: requireEnv("CALCOM_OAUTH_CLIENT_ID"),
    client_secret: requireEnv("CALCOM_OAUTH_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export function expiresAtFromNow(expiresInSeconds: number): string {
  return new Date(Date.now() + Math.max(60, expiresInSeconds) * 1000).toISOString();
}

// -----------------------------------------------------------------------------
// Bearer resolution
// -----------------------------------------------------------------------------

type ConnectionRow = {
  id: string;
  auth_type?: string | null;
  calcom_api_key?: string | null;
  calcom_access_token?: string | null;
  calcom_refresh_token?: string | null;
  calcom_token_expires_at?: string | null;
};

/**
 * Return a usable Cal.com bearer token for a connection row, refreshing the
 * OAuth access token when it is expired or about to expire.
 */
export async function resolveCalcomBearer(row: ConnectionRow): Promise<string | null> {
  if (row.auth_type !== "oauth") return row.calcom_api_key ?? null;
  if (!row.calcom_refresh_token) return row.calcom_access_token ?? null;

  const expiresAt = row.calcom_token_expires_at ? Date.parse(row.calcom_token_expires_at) : 0;
  const stillFresh = row.calcom_access_token && expiresAt - Date.now() > 120_000;
  if (stillFresh) return row.calcom_access_token as string;

  try {
    const tokens = await refreshCalcomTokens(row.calcom_refresh_token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("calcom_connections")
      .update({
        calcom_access_token: tokens.access_token,
        calcom_refresh_token: tokens.refresh_token || row.calcom_refresh_token,
        calcom_token_expires_at: expiresAtFromNow(tokens.expires_in),
        connection_status: "connected",
        connection_error: null,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return tokens.access_token;
  } catch (error) {
    console.error("[calcom:oauth-refresh]", error);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cal.com refresh tokens are single-use. If another request refreshed at the
    // same moment, it has already stored a new token — use that instead of
    // wrongly marking the connection as expired.
    // The winning request may still be mid-write, so re-check a few times.
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 750));
      const { data: latest } = await supabaseAdmin
        .from("calcom_connections")
        .select("calcom_access_token, calcom_refresh_token, calcom_token_expires_at")
        .eq("id", row.id)
        .maybeSingle();
      if (latest && latest.calcom_refresh_token !== row.calcom_refresh_token) {
        const exp = latest.calcom_token_expires_at ? Date.parse(latest.calcom_token_expires_at) : 0;
        if (latest.calcom_access_token && exp - Date.now() > 60_000) {
          return latest.calcom_access_token as string;
        }
      }
    }
    // Only mark as expired if nobody rotated the token in the meantime.
    const { data: flipped } = await supabaseAdmin
      .from("calcom_connections")
      .update({
        connection_status: "error",
        connection_error: "Cal.com connection expired — please reconnect.",
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("calcom_refresh_token", row.calcom_refresh_token)
      .neq("connection_status", "error")
      .select("therapist_id, user_id");
    // Only notify on the first transition to "error", never on repeat checks.
    const first = flipped?.[0];
    if (first) {
      try {
        await notifyCalendarDisconnected(first.therapist_id, first.user_id);
      } catch (e) {
        console.error("[calcom:disconnect-notify]", e);
      }
    }
    return null;
  }
}

async function notifyCalendarDisconnected(therapistId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const { getAdminNotificationRecipients, isLiveSiteRequest, getPreviewAdminEmail } =
    await import("@/lib/admin-recipients.server");
  const [{ data: tp }, { data: prof }] = await Promise.all([
    supabaseAdmin
      .from("therapist_profiles")
      .select("display_name")
      .eq("id", therapistId)
      .maybeSingle(),
    supabaseAdmin.from("profiles").select("email").eq("user_id", userId).maybeSingle(),
  ]);
  const therapistName = tp?.display_name ?? undefined;
  const therapistEmail = prof?.email ?? undefined;
  const day = new Date().toISOString().slice(0, 10);
  if (therapistEmail) {
    const to = isLiveSiteRequest() ? therapistEmail : getPreviewAdminEmail();
    await sendTemplateEmail("calendar-disconnected", to, {
      templateData: { therapistName },
      idempotencyKey: `cal-disc-t-${therapistId}-${day}`,
    });
  }
  for (const admin of await getAdminNotificationRecipients()) {
    await sendTemplateEmail("calendar-disconnected", admin, {
      templateData: { therapistName, therapistEmail, forAdmin: true },
      idempotencyKey: `cal-disc-a-${therapistId}-${admin}-${day}`,
    });
  }
}
