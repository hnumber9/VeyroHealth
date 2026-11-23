import { Inngest, NonRetriableError, RetryAfterError } from "inngest";
import { z } from "zod";
import { canSendReviewReminder, reviewReminderAt } from "./review-reminder";

const reminderEvent = z.object({
  appointmentId: z.string().uuid(),
  endsAt: z.string().datetime({ offset: true }),
});

/** Called only by trusted booking handlers, never by browser-provided recipient data. */
export async function scheduleReviewReminder(appointmentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: appointment, error } = await supabaseAdmin
    .from("appointments")
    .select("id, ends_at, status")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw error;
  if (
    !appointment ||
    !["confirmed", "completed"].includes(appointment.status) ||
    new Date(appointment.ends_at).getTime() < Date.now()
  )
    return;
  const apiKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["INNGEST_API_KEY"];
  if (!apiKey || !connectionKey) throw new Error("Review reminder scheduler is not configured");
  const response = await fetch("https://connector-gateway.lovable.dev/inngest/e/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: `review-reminder-${appointment.id}-${appointment.ends_at}`,
      name: "veyro/appointment.review-reminder",
      data: { appointmentId: appointment.id, endsAt: appointment.ends_at },
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Review scheduler failed [${response.status}]: ${body}`);
    throw new Error(`Review scheduler failed [${response.status}]: ${body}`);
  }
}

/** Constructed inside the signed serve handler so secrets are request-scoped. */
export function createReviewReminderWorkflow(signingKey: string) {
  const client = new Inngest({ id: "veyro-health", isDev: false, signingKey });
  const reminder = client.createFunction(
    {
      id: "post-session-review-reminder",
      retries: 5,
      triggers: [{ event: "veyro/appointment.review-reminder" }],
      idempotency: 'event.data.appointmentId + "-" + event.data.endsAt',
    },
    async ({ event, step }) => {
      const parsed = reminderEvent.safeParse(event.data);
      if (!parsed.success) throw new NonRetriableError("Invalid review reminder event");
      const { appointmentId } = parsed.data;
      let endsAt = parsed.data.endsAt;
      // Re-read after waking: cancellation, a review or a new time always wins.
      for (let attempt = 0; attempt < 30; attempt++) {
        await step.sleepUntil(`wait-after-session-${attempt}`, reviewReminderAt(endsAt));
        const outcome = await step.run(`check-and-send-${attempt}`, async () => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: appointment, error } = await supabaseAdmin
            .from("appointments")
            .select("id, therapist_id, client_user_id, client_email, client_name, ends_at, status")
            .eq("id", appointmentId)
            .maybeSingle();
          if (error) throw error;
          if (!appointment || !["confirmed", "completed"].includes(appointment.status))
            return { done: true };
          if (new Date(reviewReminderAt(appointment.ends_at)).getTime() > Date.now())
            return { done: false, endsAt: appointment.ends_at };
          const email = appointment.client_email?.trim().toLowerCase();
          if (!email) return { done: true };
          let userId = appointment.client_user_id;
          if (!userId) {
            const { data: profile, error: profileError } = await supabaseAdmin
              .from("profiles")
              .select("user_id")
              .ilike("email", email)
              .maybeSingle();
            if (profileError) throw profileError;
            userId = profile?.user_id ?? null;
          }
          let hasReview = false;
          if (userId) {
            const { data: review, error: reviewError } = await supabaseAdmin
              .from("therapist_reviews")
              .select("id")
              .eq("therapist_id", appointment.therapist_id)
              .eq("client_user_id", userId)
              .maybeSingle();
            if (reviewError) throw reviewError;
            hasReview = !!review;
          }
          if (
            !canSendReviewReminder(appointment.status, appointment.ends_at, Date.now(), hasReview)
          )
            return { done: true };
          const { data: therapist, error: therapistError } = await supabaseAdmin
            .from("therapist_profiles")
            .select("display_name")
            .eq("id", appointment.therapist_id)
            .maybeSingle();
          if (therapistError) throw therapistError;
          if (!therapist) return { done: true };
          const { sendTemplateEmail } = await import("./email-templates/send-email");
          try {
            await sendTemplateEmail("review-reminder", email, {
              idempotencyKey: `review-reminder-${appointment.id}`,
              templateData: {
                clientName: appointment.client_name,
                therapistName: therapist.display_name,
                reviewUrl: "https://www.veyrohealth.com/client/dashboard#leave-review",
              },
            });
          } catch (error) {
            if (error && typeof error === "object" && "status" in error && error.status === 429) {
              const seconds =
                "retryAfterSeconds" in error && typeof error.retryAfterSeconds === "number"
                  ? error.retryAfterSeconds
                  : 60;
              throw new RetryAfterError("Email sending allowance reached", `${seconds}s`);
            }
            throw error;
          }
          return { done: true };
        });
        if (outcome.done) return { handled: true };
        if ("endsAt" in outcome && outcome.endsAt) endsAt = outcome.endsAt;
      }
      throw new NonRetriableError("Appointment rescheduled too many times");
    },
  );
  return { client, functions: [reminder] };
}
