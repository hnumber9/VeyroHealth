import { deliverEmail } from '@/lib/deliver-email.server'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const SITE_NAME = 'Veyro'
const FROM_DOMAIN = 'mail.veyrohealth.com'
const NOTIFY_TO = ['join@veyrohealth.com', 'support@veyrohealth.com']

const InterestSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  note: z.string().max(2000).optional().default(''),
})

function escapeHtml(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const Route = createFileRoute('/api/public/therapist-interest')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: z.infer<typeof InterestSchema>
        try {
          payload = InterestSchema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Invalid form submission' }, { status: 400 })
        }

        const { error: insertError } = await supabaseAdmin.from('therapist_interest').insert({
          name: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
          note: payload.note.trim() || null,
        })
        if (insertError) {
          console.error('[therapist-interest] insert failed', insertError)
          return Response.json({ error: 'Could not record your interest' }, { status: 500 })
        }

        // Notification is best-effort: the waiting-list record is already saved.
        const submittedAt = new Date().toISOString()
        const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1c2b2b">
<h2 style="font-weight:600">New therapist interest</h2>
<p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
<p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
${payload.note.trim() ? `<p><strong>Note:</strong><br>${escapeHtml(payload.note).replace(/\n/g, '<br>')}</p>` : ''}
<p style="color:#667">Registered ${submittedAt}</p>
</div>`
        const text = `New therapist interest\n\nName: ${payload.name}\nEmail: ${payload.email}\n${payload.note.trim() ? `Note: ${payload.note}\n` : ''}Registered ${submittedAt}`

        for (const to of NOTIFY_TO) {
          const messageId = crypto.randomUUID()
          try {
            const { error: enqueueError } = await deliverEmail(supabaseAdmin, {
              message_id: messageId,
              to,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              reply_to: payload.email,
              sender_domain: FROM_DOMAIN,
              subject: `Therapist interest — ${payload.name}`,
              html,
              text,
              purpose: 'transactional',
              label: 'therapist-interest',
              idempotency_key: messageId,
              queued_at: submittedAt,
            })
            if (enqueueError) console.error('[therapist-interest] email failed', to, enqueueError)
          } catch (e) {
            console.error('[therapist-interest] email failed', to, e)
          }
        }

        return Response.json({ success: true })
      },
    },
  },
})
