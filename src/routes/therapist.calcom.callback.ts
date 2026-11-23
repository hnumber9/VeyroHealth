import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/therapist/calcom/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const oauthError =
          url.searchParams.get("error_description") ?? url.searchParams.get("error");

        const { verifyCalcomState, exchangeCalcomCode, expiresAtFromNow } =
          await import("@/lib/calcom-oauth.server");

        const verified = state ? verifyCalcomState(state) : null;
        const base = verified?.returnOrigin ?? "https://www.veyrohealth.com";
        const done = (params: string) =>
          Response.redirect(`${base}/therapist/dashboard?tab=availability&${params}`, 302);
        const fail = (reason: string) => done(`calcom=error&reason=${encodeURIComponent(reason)}`);

        if (oauthError) return fail(oauthError);
        if (!code || !state) return fail("missing_code");
        if (!verified) return fail("invalid_state");

        try {
          // Cal.com requires the token exchange redirect URI to exactly match
          // the URI used for authorisation. This request URL is that callback,
          // whether the flow used the production or stable preview origin.
          const callbackOrigin = new URL(request.url).origin;
          const tokens = await exchangeCalcomCode(
            code,
            `${callbackOrigin}/therapist/calcom/callback`,
          );
          const { getCalcomMe } = await import("@/lib/calcom.server");
          const me = await getCalcomMe(tokens.access_token);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: profile } = await supabaseAdmin
            .from("therapist_profiles")
            .select("id")
            .eq("user_id", verified.userId)
            .maybeSingle();
          if (!profile) return fail("no_profile");

          const { error } = await supabaseAdmin.from("calcom_connections").upsert(
            {
              therapist_id: profile.id,
              user_id: verified.userId,
              auth_type: "oauth",
              calcom_api_key: null,
              calcom_access_token: tokens.access_token,
              calcom_refresh_token: tokens.refresh_token,
              calcom_token_expires_at: expiresAtFromNow(tokens.expires_in),
              calcom_scopes: tokens.scope ?? null,
              calcom_username: me.username,
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
            console.error("[calcom:oauth-save]", error);
            return fail("save_failed");
          }

          await supabaseAdmin
            .from("therapist_profiles")
            .update({
              calcom_connected_at: new Date().toISOString(),
              calcom_username: me.username,
            })
            .eq("id", profile.id);

          const { syncAllServiceEventTypes } = await import("@/lib/calcom-sync.server");
          await syncAllServiceEventTypes(verified.userId);

          // Register the cancellation webhook so Veyro can email both sides
          // when a booking is cancelled inside Cal.com.
          const webhookSecret = process.env["CALCOM_WEBHOOK_SECRET"];
          if (webhookSecret) {
            const { ensureCancellationWebhook } = await import("@/lib/calcom.server");
            await ensureCancellationWebhook(
              tokens.access_token,
              "https://www.veyrohealth.com/api/public/calcom/webhook",
              webhookSecret,
            );
          }

          return done("calcom=connected");
        } catch (err) {
          console.error("[calcom:oauth-callback]", err);
          return fail("connect_failed");
        }
      },
    },
  },
});
