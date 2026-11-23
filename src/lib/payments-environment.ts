/**
 * Server-decided Stripe environment. Browser-safe (no secrets) so it can be
 * unit tested, but only server code should rely on it for decisions.
 *
 * The client never chooses the environment: a production build, or a request
 * to a production hostname, always means live. Sandbox exists only in preview.
 */
export type StripeEnv = "sandbox" | "live";

export const PRODUCTION_HOSTS = [
  "veyrohealth.com",
  "www.veyrohealth.com",
  "veyro-join-launch.lovable.app",
] as const;

export interface RuntimeContext {
  /** True for the published (production) build; set from import.meta.env.PROD. */
  isProductionBuild: boolean;
  /** Hostname the request was served on, if known. */
  host?: string | null;
}

export function isProductionHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const name = host.toLowerCase().split(":")[0] ?? "";
  return (PRODUCTION_HOSTS as readonly string[]).includes(name);
}

export function isProductionRuntime(ctx: RuntimeContext): boolean {
  return ctx.isProductionBuild || isProductionHost(ctx.host);
}

/** The only Stripe environment a booking may be created in for this request. */
export function stripeEnvironmentFor(ctx: RuntimeContext): StripeEnv {
  return isProductionRuntime(ctx) ? "live" : "sandbox";
}

/** Production never processes sandbox (test-mode) webhook events. */
export function isWebhookEnvironmentAllowed(env: StripeEnv, ctx: RuntimeContext): boolean {
  return env === "live" || !isProductionRuntime(ctx);
}

/** Runtime context for the current server request. */
export function serverRuntimeContext(requestUrl: string | null | undefined): RuntimeContext {
  let host: string | null = null;
  try {
    host = requestUrl ? new URL(requestUrl).hostname : null;
  } catch {
    host = null;
  }
  return { isProductionBuild: Boolean(import.meta.env.PROD), host };
}
