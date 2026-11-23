import { createFileRoute } from "@tanstack/react-router";

interface InviteePayload {
  event: "invitee.created" | "invitee.canceled" | string;
  payload: {
    uri: string; // invitee uri
    email: string;
    name?: string | null;
    status?: string;
    cancel_url?: string;
    reschedule_url?: string;
    scheduled_event: {
      uri: string;
      start_time: string;
      end_time: string;
      location?: { type?: string; join_url?: string; location?: string } | null;
      event_memberships?: Array<{ user: string }>;
    };
  };
}

export const Route = createFileRoute("/api/public/calendly/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const sig = request.headers.get("calendly-webhook-signature");
        const { verifyWebhookSignature } = await import("@/lib/calendly.server");
        if (!verifyWebhookSignature(sig, raw)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let body: InviteePayload;
        try {
          body = JSON.parse(raw) as InviteePayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const scheduled = body.payload?.scheduled_event;
        const membershipUser = scheduled?.event_memberships?.[0]?.user;
        if (!membershipUser) return new Response("no user", { status: 200 });

        // Find therapist by Calendly user URI
        const { data: conn } = await supabaseAdmin
          .from("calendly_connections")
          .select("therapist_id")
          .eq("calendly_user_uri", membershipUser)
          .maybeSingle();
        if (!conn) return new Response("unknown therapist", { status: 200 });

        const inviteeEmail = body.payload.email.toLowerCase();
        const meetingUrl = scheduled.location?.join_url ?? null;

        if (body.event === "invitee.created") {
          // Link client
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("email", inviteeEmail)
            .maybeSingle();

          const { data: existingLink } = await supabaseAdmin
            .from("therapist_clients")
            .select("id")
            .eq("therapist_id", conn.therapist_id)
            .eq("client_email", inviteeEmail)
            .maybeSingle();
          if (!existingLink) {
            await supabaseAdmin.from("therapist_clients").insert({
              therapist_id: conn.therapist_id,
              client_email: inviteeEmail,
              client_user_id: profile?.user_id ?? null,
              linked_via: "calendly",
            });
          } else if (profile?.user_id) {
            await supabaseAdmin
              .from("therapist_clients")
              .update({ client_user_id: profile.user_id })
              .eq("id", existingLink.id);
          }

          const row = {
            therapist_id: conn.therapist_id,
            client_email: inviteeEmail,
            client_name: body.payload.name ?? null,
            client_user_id: profile?.user_id ?? null,
            starts_at: scheduled.start_time,
            ends_at: scheduled.end_time,
            meeting_url: meetingUrl,
            status: "confirmed",
            calendly_event_uri: scheduled.uri,
            calendly_invitee_uri: body.payload.uri,
          };
          const { data: existing } = await supabaseAdmin
            .from("appointments")
            .select("id")
            .eq("calendly_invitee_uri", body.payload.uri)
            .maybeSingle();
          let upserted: { id: string } | null = null;
          if (existing) {
            const { data } = await supabaseAdmin
              .from("appointments")
              .update(row)
              .eq("id", existing.id)
              .select("id")
              .maybeSingle();
            upserted = data ?? { id: existing.id };
          } else {
            const { data } = await supabaseAdmin
              .from("appointments")
              .insert(row)
              .select("id")
              .maybeSingle();
            upserted = data ?? null;
          }

          if (upserted?.id) {
            try {
              const { sendBookingConfirmationForAppointment } = await import(
                "@/lib/send-booking-confirmation.server"
              );
              await sendBookingConfirmationForAppointment(upserted.id);
            } catch (e) {
              console.error("booking confirmation send failed:", e);
            }
          }
        } else if (body.event === "invitee.canceled") {
          await supabaseAdmin
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("calendly_invitee_uri", body.payload.uri);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
