import { deliverEmail } from '@/lib/deliver-email.server'
import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Veyro'
const SENDER_DOMAIN = 'mail.veyrohealth.com'
const FROM_DOMAIN = 'mail.veyrohealth.com'

const Schema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(320),
})

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function getOrCreateUnsubscribeToken(email: string): Promise<string> {
  const normalized = email.toLowerCase()
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalized)
    .maybeSingle()
  if (existing && !existing.used_at) return existing.token
  const token = generateToken()
  await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .upsert({ token, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
  const { data: stored } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalized)
    .maybeSingle()
  return stored?.token ?? token
}

export const Route = createFileRoute('/api/public/patient-interest')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: z.infer<typeof Schema>
        try {
          payload = Schema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Invalid form submission' }, { status: 400 })
        }

        const template = TEMPLATES['patient-interest']
        if (!template || !template.to) {
          return Response.json({ error: 'Template not configured' }, { status: 500 })
        }

        const messageId = crypto.randomUUID()
        const submittedAt = new Date().toISOString()
        const templateData = { ...payload, submittedAt }

        const element = React.createElement(template.component, templateData)
        const html = await render(element)
        const plainText = await render(element, { plainText: true })
        const subject =
          typeof template.subject === 'function' ? template.subject(templateData) : template.subject

        const unsubscribeToken = await getOrCreateUnsubscribeToken(template.to)


        const { error: enqueueError } = await deliverEmail(supabaseAdmin, {
            message_id: messageId,
            to: template.to,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            reply_to: payload.email,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text: plainText,
            purpose: 'transactional',
            label: 'patient-interest',
            idempotency_key: messageId,
            unsubscribe_token: unsubscribeToken,
            queued_at: submittedAt,
          })

        if (enqueueError) {
          console.error('Failed to enqueue patient interest email', enqueueError)
          return Response.json({ error: 'Failed to submit' }, { status: 500 })
        }

        return Response.json({ success: true })
      },
    },
  },
})
