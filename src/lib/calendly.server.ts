import { createHmac, timingSafeEqual } from "node:crypto";

export const CALENDLY_AUTH_BASE = "https://auth.calendly.com";
export const CALENDLY_API_BASE = "https://api.calendly.com";

export function getSiteOrigin(): string {
  // Prefer the canonical published origin so the OAuth redirect_uri matches
  // what's registered in the Calendly app.
  return process.env.CALENDLY_REDIRECT_ORIGIN || "https://www.veyrohealth.com";
}

export function getRedirectUri(): string {
  return `${getSiteOrigin()}/therapist/calendly/callback`;
}

export function getWebhookUrl(): string {
  return `${getSiteOrigin()}/api/public/calendly/webhook`;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

// -----------------------------------------------------------------------------
// State (signed) — links the OAuth callback back to a specific therapist user.
// -----------------------------------------------------------------------------

const ALLOWED_ORIGIN_SUFFIXES = [
  "veyrohealth.com",
  "lovable.app",
  "lovable.dev",
  "lovableproject.com",
];

export function isAllowedReturnOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname;
    return ALLOWED_ORIGIN_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

export function signState(userId: string, returnOrigin?: string | null, ttlSeconds = 600): string {
  const key = requireEnv("CALENDLY_WEBHOOK_SIGNING_KEY");
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const originB64 = returnOrigin ? Buffer.from(returnOrigin, "utf8").toString("base64url") : "";
  const payload = `${userId}.${expiry}.${originB64}`;
  const sig = createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyState(state: string): { userId: string; returnOrigin: string | null } | null {
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [userId, expiryStr, originB64, sig] = parts;
  const expiry = Number(expiryStr);
  if (!userId || !Number.isFinite(expiry)) return null;
  if (Math.floor(Date.now() / 1000) > expiry) return null;
  const key = requireEnv("CALENDLY_WEBHOOK_SIGNING_KEY");
  const expected = createHmac("sha256", key)
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

// -----------------------------------------------------------------------------
// Webhook signature verification
// Calendly sends: `Calendly-Webhook-Signature: t=<unix>,v1=<hexHmac>`
// hmac = HMAC-SHA256(`${t}.${rawBody}`, signingKey)
// -----------------------------------------------------------------------------

export function verifyWebhookSignature(header: string | null, rawBody: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    }),
  ) as { t?: string; v1?: string };
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // Reject stale timestamps (5 min tolerance)
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - Number(t)) > 300) return false;
  const key = requireEnv("CALENDLY_WEBHOOK_SIGNING_KEY");
  const expected = createHmac("sha256", key).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(v1, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// -----------------------------------------------------------------------------
// Token exchange + refresh
// -----------------------------------------------------------------------------

export interface CalendlyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
  scope?: string;
  owner?: string; // user URI
  organization?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<CalendlyTokens> {
  const res = await fetch(`${CALENDLY_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      client_id: requireEnv("CALENDLY_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("CALENDLY_OAUTH_CLIENT_SECRET"),
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Calendly token exchange failed [${res.status}]: ${body}`);
  }
  return (await res.json()) as CalendlyTokens;
}

export async function refreshTokens(refreshToken: string): Promise<CalendlyTokens> {
  const res = await fetch(`${CALENDLY_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: requireEnv("CALENDLY_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("CALENDLY_OAUTH_CLIENT_SECRET"),
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Calendly token refresh failed [${res.status}]: ${body}`);
  }
  return (await res.json()) as CalendlyTokens;
}

// -----------------------------------------------------------------------------
// Calendly API helpers (direct — this app owns per-user OAuth, not gateway)
// -----------------------------------------------------------------------------

async function calendlyFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CALENDLY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Calendly API ${path} failed [${res.status}]: ${body}`);
  }
  return (await res.json()) as T;
}

export interface CalendlyUser {
  resource: {
    uri: string;
    name: string;
    email: string;
    scheduling_url: string;
    current_organization: string;
  };
}

export async function getCalendlyUser(accessToken: string): Promise<CalendlyUser> {
  return calendlyFetch<CalendlyUser>(accessToken, "/users/me");
}

export interface CalendlyWebhookSubscription {
  resource: { uri: string; callback_url: string; state: string };
}

export async function createWebhookSubscription(params: {
  accessToken: string;
  organization: string;
  user: string;
}): Promise<CalendlyWebhookSubscription> {
  const signingKey = requireEnv("CALENDLY_WEBHOOK_SIGNING_KEY");
  return calendlyFetch<CalendlyWebhookSubscription>(params.accessToken, "/webhook_subscriptions", {
    method: "POST",
    body: JSON.stringify({
      url: getWebhookUrl(),
      events: ["invitee.created", "invitee.canceled"],
      organization: params.organization,
      user: params.user,
      scope: "user",
      signing_key: signingKey,
    }),
  });
}

export async function deleteWebhookSubscription(
  accessToken: string,
  subscriptionUri: string,
): Promise<void> {
  // subscriptionUri is a full URL like https://api.calendly.com/webhook_subscriptions/UUID
  const path = subscriptionUri.replace(CALENDLY_API_BASE, "");
  await fetch(`${CALENDLY_API_BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => undefined);
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`${CALENDLY_AUTH_BASE}/oauth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token,
      client_id: requireEnv("CALENDLY_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("CALENDLY_OAUTH_CLIENT_SECRET"),
    }).toString(),
  }).catch(() => undefined);
}

export function expiresAtFromNow(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
