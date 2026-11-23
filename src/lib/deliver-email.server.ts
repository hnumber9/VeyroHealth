import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";
import { isNotificationRecipientExcluded } from "./notification-recipients";

// Server-only: sends a pre-rendered email through Lovable's managed email API
// and records 'sent'/'suppressed' in email_send_log (used for per-feature
// de-duping). Callers record 'failed' rows themselves when error is returned.

export interface DeliverEmailPayload {
  to: string;
  from: string;
  sender_domain: string;
  subject: string;
  html: string;
  text: string;
  purpose?: "transactional";
  label: string;
  idempotency_key?: string;
  reply_to?: string;
  // Legacy queue fields — accepted and ignored.
  message_id?: string;
  unsubscribe_token?: string;
  queued_at?: string;
}

type Db = { from: (table: string) => any };

export async function deliverEmail(
  db: Db,
  payload: DeliverEmailPayload,
  metadata?: Record<string, unknown> | null,
): Promise<{ error: { message: string } | null; suppressed?: boolean }> {
  if (isNotificationRecipientExcluded(payload.to)) {
    return { error: null, suppressed: true };
  }
  const apiKey = process.env["LOVABLE_API_KEY"];
  const messageId = payload.message_id ?? null;
  const log = async (row: Record<string, unknown>) => {
    const { error } = await db.from("email_send_log").insert({
      message_id: messageId,
      template_name: payload.label,
      recipient_email: payload.to,
      metadata: metadata ?? null,
      ...row,
    });
    if (error)
      console.error("[email] send log write failed", { code: error.code, message: error.message });
  };

  if (!apiKey) {
    return { error: { message: "LOVABLE_API_KEY is not configured" } };
  }

  try {
    await sendLovableEmail(
      {
        to: payload.to,
        from: payload.from,
        sender_domain: payload.sender_domain,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        purpose: "transactional",
        label: payload.label,
        idempotency_key: payload.idempotency_key || crypto.randomUUID(),
        reply_to: payload.reply_to || "support@veyrohealth.com",
      },
      { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
    );
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === "recipient_suppressed") {
      await log({ status: "suppressed" });
      return { error: null, suppressed: true };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { error: { message } };
  }

  await log({ status: "sent" });
  return { error: null };
}
