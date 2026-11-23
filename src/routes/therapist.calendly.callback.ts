import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/therapist/calendly/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        const {
          verifyState,
          exchangeCodeForTokens,
          getCalendlyUser,
          createWebhookSubscription,
          expiresAtFromNow,
        } = await import("@/lib/calendly.server");

        const verifiedEarly = state ? verifyState(state) : null;
        const base = verifiedEarly?.returnOrigin ?? "https://www.veyrohealth.com";
        const returnPath = "/therapist/dashboard";
        const fail = (reason: string) =>
          Response.redirect(
            `${base}${returnPath}?calendly=error&reason=${encodeURIComponent(reason)}`,
            302,
          );

        if (err) return fail(err);
        if (!code || !state) return fail("missing_code");
        const verified = verifiedEarly;
        if (!verified) return fail("invalid_state");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Look up therapist profile for this user, or create a minimal one so the
        // OAuth connection can attach even if onboarding hasn't been saved yet.
        let { data: tp } = await supabaseAdmin
          .from("therapist_profiles")
          .select("id")
          .eq("user_id", verified.userId)
          .maybeSingle();
        if (!tp) {
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("user_id", verified.userId)
            .maybeSingle();
          const displayName =
            [prof?.first_name, prof?.last_name].filter(Boolean).join(" ").trim() ||
            (prof?.email ? prof.email.split("@")[0] : "therapist");
          const baseSlug =
            displayName
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 40) || "therapist";
          const slug = `${baseSlug}-${verified.userId.slice(0, 8)}`;
          const { data: created, error: createErr } = await supabaseAdmin
            .from("therapist_profiles")
            .insert({
              user_id: verified.userId,
              slug,
              display_name: displayName,
              published: false,
            })
            .select("id")
            .single();
          if (createErr) {
            console.error("therapist_profiles auto-create failed:", createErr);
            return fail("no_therapist_profile");
          }
          tp = created;
        }

        let tokens;
        try {
          tokens = await exchangeCodeForTokens(code);
        } catch (e) {
          console.error("Calendly token exchange failed:", e);
          return fail("token_exchange_failed");
        }

        let me;
        try {
          me = await getCalendlyUser(tokens.access_token);
        } catch (e) {
          console.error("Calendly /users/me failed:", e);
          return fail("user_fetch_failed");
        }

        // Create webhook subscription for this user (best-effort — retry on save)
        let subscriptionUri: string | null = null;
        try {
          const sub = await createWebhookSubscription({
            accessToken: tokens.access_token,
            organization: me.resource.current_organization,
            user: me.resource.uri,
          });
          subscriptionUri = sub.resource.uri;
        } catch (e) {
          console.error("Calendly webhook subscription failed:", e);
          // Continue — connection still saved; user can reconnect to retry.
        }

        // A Calendly account can only belong to one therapist account at a time.
        // If the same Calendly user was connected to an older Veyro account,
        // the OAuth grant proves the current user controls it, so transfer it.
        const { data: existingCalendlyConn } = await supabaseAdmin
          .from("calendly_connections")
          .select("id, user_id, therapist_id, webhook_subscription_uri")
          .eq("calendly_user_uri", me.resource.uri)
          .maybeSingle();
        if (!subscriptionUri && existingCalendlyConn?.webhook_subscription_uri) {
          subscriptionUri = existingCalendlyConn.webhook_subscription_uri;
        }
        if (
          existingCalendlyConn &&
          (existingCalendlyConn.user_id !== verified.userId ||
            existingCalendlyConn.therapist_id !== tp.id)
        ) {
          await supabaseAdmin
            .from("calendly_connections")
            .delete()
            .eq("id", existingCalendlyConn.id);
        }

        const { error: upsertErr } = await supabaseAdmin.from("calendly_connections").upsert(
          {
            therapist_id: tp.id,
            user_id: verified.userId,
            calendly_user_uri: me.resource.uri,
            calendly_organization_uri: me.resource.current_organization,
            calendly_email: me.resource.email,
            calendly_name: me.resource.name,
            scheduling_url: me.resource.scheduling_url,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAtFromNow(tokens.expires_in),
            webhook_subscription_uri: subscriptionUri,
          },
          { onConflict: "user_id" },
        );

        if (upsertErr) {
          console.error("calendly_connections upsert failed:", upsertErr);
          return fail("save_failed");
        }

        // Auto-populate the public calendly_url on the profile if empty.
        await supabaseAdmin
          .from("therapist_profiles")
          .update({ calendly_url: me.resource.scheduling_url })
          .eq("id", tp.id);

        return Response.redirect(`${base}${returnPath}?calendly=connected`, 302);
      },
    },
  },
});
