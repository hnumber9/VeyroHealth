import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyCalcomConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("calcom_connections")
      .select(
        "calcom_username, calcom_email, calcom_name, timezone, connection_status, connection_error, last_checked_at, created_at",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    return { connection: data };
  });

export const connectCalcom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ apiKey: z.string().trim().min(10, "That API key looks too short").max(400) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: profile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Complete your profile before connecting your calendar.");

    const { getCalcomMe, CalcomError } = await import("@/lib/calcom.server");
    let me: Awaited<ReturnType<typeof getCalcomMe>>;
    try {
      me = await getCalcomMe(data.apiKey);
    } catch (error) {
      if (error instanceof CalcomError && error.status === 401) {
        throw new Error(
          "Cal.com rejected that API key. Copy it again from Cal.com → Settings → Developer → API keys.",
        );
      }
      console.error("[calcom:connect]", error);
      throw new Error("Couldn't reach Cal.com with that API key. Please try again.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("calcom_connections").upsert(
      {
        therapist_id: profile.id,
        user_id: userId,
        calcom_username: me.username,
        auth_type: "api_key",
        calcom_api_key: data.apiKey,
        calcom_access_token: null,
        calcom_refresh_token: null,
        calcom_token_expires_at: null,
        calcom_scopes: null,
        calcom_user_id: me.id,
        calcom_email: me.email ?? null,
        calcom_name: me.name ?? null,
        timezone: me.timeZone ?? "Europe/London",
        connection_status: "connected",
        connection_error: null,
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: "therapist_id" },
    );
    if (error) {
      console.error("[calcom:connect-save]", error);
      throw new Error("Couldn't save your calendar connection.");
    }

    await supabaseAdmin
      .from("therapist_profiles")
      .update({ calcom_connected_at: new Date().toISOString(), calcom_username: me.username })
      .eq("id", profile.id);

    // Create the Cal.com event types for any sessions already saved.
    const { syncAllServiceEventTypes } = await import("@/lib/calcom-sync.server");
    const synced = await syncAllServiceEventTypes(userId);

    return {
      ok: true,
      connection: { calcom_username: me.username, calcom_email: me.email, calcom_name: me.name },
      syncedServices: synced.filter((s) => s.ok).length,
    };
  });

export const disconnectCalcom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("calcom_connections").delete().eq("user_id", context.userId);
    // Without a calendar the profile can't take bookings, so it leaves the directory.
    await supabaseAdmin
      .from("therapist_profiles")
      .update({ calcom_connected_at: null, calcom_username: null })
      .eq("user_id", context.userId);
    await supabaseAdmin
      .from("therapist_services")
      .update({ calcom_event_type_id: null, calcom_event_type_slug: null })
      .eq("user_id", context.userId);
    return { ok: true };
  });

/**
 * Start the "Continue with Cal.com" OAuth flow — returns the Cal.com
 * authorization URL the therapist should be sent to.
 */
export const startCalcomOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ returnOrigin: z.string().url().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const {
      buildCalcomAuthorizeUrl,
      signCalcomState,
      isCalcomOAuthConfigured,
      isAllowedReturnOrigin,
    } = await import("@/lib/calcom-oauth.server");
    if (!isCalcomOAuthConfigured()) {
      throw new Error("Cal.com one-click connect isn't available yet.");
    }
    const origin =
      data.returnOrigin && isAllowedReturnOrigin(data.returnOrigin) ? data.returnOrigin : null;
    const isPreview = origin
      ? origin.includes("id-preview--") || origin.endsWith(".lovableproject.com")
      : false;
    const redirectUri = isPreview
      ? "https://id-preview--be78a48d-d6e2-4e8c-9965-280dce04b280.lovable.app/therapist/calcom/callback"
      : undefined;
    return {
      // Preview uses its stable registered callback rather than the temporary
      // lovableproject.com host. Signed state still returns the user to the
      // exact preview tab where they started.
      url: buildCalcomAuthorizeUrl(signCalcomState(context.userId, origin), redirectUri),
    };
  });

/** Whether one-click Cal.com connect is available in this environment. */
export const getCalcomOAuthAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const { isCalcomOAuthConfigured } = await import("@/lib/calcom-oauth.server");
  return { oauthAvailable: isCalcomOAuthConfigured() };
});
