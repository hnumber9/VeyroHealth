import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const startCalendlyOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ returnOrigin: z.string().url().max(300).optional() }).parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { signState, getRedirectUri, CALENDLY_AUTH_BASE, isAllowedReturnOrigin } =
      await import("@/lib/calendly.server");
    const clientId = process.env.CALENDLY_OAUTH_CLIENT_ID;
    if (!clientId) throw new Error("Calendly is not configured on the server.");
    const returnOrigin =
      data.returnOrigin && isAllowedReturnOrigin(data.returnOrigin) ? data.returnOrigin : null;
    const state = signState(context.userId, returnOrigin);
    const url = new URL(`${CALENDLY_AUTH_BASE}/oauth/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", getRedirectUri());
    url.searchParams.set("state", state);
    return { authorizeUrl: url.toString() };
  });

export const getCalendlyConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("calendly_connections")
      .select("calendly_email, calendly_name, scheduling_url, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { connection: data };
  });

export const disconnectCalendly = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("calendly_connections")
      .select("access_token, refresh_token, webhook_subscription_uri, therapist_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (conn) {
      const { deleteWebhookSubscription, revokeToken } = await import("@/lib/calendly.server");
      if (conn.webhook_subscription_uri) {
        await deleteWebhookSubscription(conn.access_token, conn.webhook_subscription_uri);
      }
      await revokeToken(conn.refresh_token);
    }
    await supabaseAdmin.from("calendly_connections").delete().eq("user_id", context.userId);
    // Disconnecting must also take the profile out of the public directory /
    // booking flow — otherwise the stale scheduling URL keeps it bookable.
    await supabaseAdmin
      .from("therapist_profiles")
      .update({ calendly_url: null, calendly_user_uri: null, calendly_connected_at: null })
      .eq("user_id", context.userId);
    return { ok: true };
  });
