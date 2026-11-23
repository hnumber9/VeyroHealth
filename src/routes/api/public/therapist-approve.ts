import { deliverEmail } from '@/lib/deliver-email.server'
import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Veyro'
const SENDER_DOMAIN = 'mail.veyrohealth.com'
const FROM_DOMAIN = 'mail.veyrohealth.com'
const SITE_URL = 'https://www.veyrohealth.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function page(title: string, message: string, opts?: { link?: { href: string; label: string } }) {
  const link = opts?.link
    ? `<p style="margin-top:24px"><a href="${opts.link.href}" style="color:#0f7a3d;font-weight:600">${opts.link.label}</a></p>`
    : ''
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title} — Veyro</title></head>
<body style="font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;max-width:560px;margin:80px auto;padding:24px">
<h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
<p style="font-size:15px;line-height:1.55">${message}</p>${link}
</body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export const Route = createFileRoute('/api/public/therapist-approve')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const token = url.searchParams.get('token')?.trim() ?? ''
        if (!/^[a-f0-9]{64}$/.test(token)) {
          return page('Invalid link', 'This approval link is missing or malformed.')
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        const { data: tokenRow, error: tokenErr } = await supabaseAdmin
          .from('therapist_approval_tokens')
          .select('id, therapist_profile_id, used_at, expires_at')
          .eq('token', token)
          .maybeSingle()

        if (tokenErr || !tokenRow) {
          return page('Invalid link', 'We couldn\u2019t find that approval link.')
        }
        if (tokenRow.used_at) {
          return page('Already approved', 'This profile has already been approved.')
        }
        if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
          return page('Link expired', 'This approval link has expired. Please approve the profile directly in the database.')
        }

        const { data: profile, error: profErr } = await supabaseAdmin
          .from('therapist_profiles')
          .update({ published: true })
          .eq('id', tokenRow.therapist_profile_id)
          .select('id, user_id, display_name, slug')
          .single()

        if (profErr || !profile) {
          console.error('[therapist-approve] publish failed', profErr)
          return page('Something went wrong', 'We couldn\u2019t publish this profile. Please try again or approve it manually.')
        }

        // Grant the 'therapist' role now that the clinical team has approved
        // the profile. Users can no longer self-assign this role from the
        // client; this is the vetted entry point.
        const { error: roleErr } = await supabaseAdmin
          .from('user_roles')
          .upsert(
            { user_id: profile.user_id, role: 'therapist' },
            { onConflict: 'user_id,role', ignoreDuplicates: true },
          )
        if (roleErr) {
          console.error('[therapist-approve] role grant failed', roleErr)
        }

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
        await supabaseAdmin
          .from('therapist_approval_tokens')
          .update({ used_at: new Date().toISOString(), used_by_ip: ip })
          .eq('id', tokenRow.id)

        // Fetch therapist email + fire approval notification (best-effort).
        try {
          const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
          const therapistEmail = userRes?.user?.email ?? null
          const approvedTemplate = TEMPLATES['therapist-approved']
          if (therapistEmail && approvedTemplate) {
            const profileUrl = profile.slug ? `${SITE_URL}/therapist/${profile.slug}` : null
            const fullName = profile.display_name?.split(/\s+/)[0] ?? undefined
            const templateData = { fullName, profileUrl }
            const element = React.createElement(approvedTemplate.component, templateData)
            const html = await render(element)
            const text = await render(element, { plainText: true })
            const subject =
              typeof approvedTemplate.subject === 'function'
                ? approvedTemplate.subject(templateData)
                : approvedTemplate.subject
            const messageId = crypto.randomUUID()

            // unsubscribe token
            const normalized = therapistEmail.toLowerCase()
            const { data: existing } = await supabaseAdmin
              .from('email_unsubscribe_tokens')
              .select('token, used_at')
              .eq('email', normalized)
              .maybeSingle()
            let unsub = existing && !existing.used_at ? existing.token : generateToken()
            if (!existing || existing.used_at) {
              await supabaseAdmin
                .from('email_unsubscribe_tokens')
                .upsert({ token: unsub, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
              const { data: stored } = await supabaseAdmin
                .from('email_unsubscribe_tokens')
                .select('token')
                .eq('email', normalized)
                .maybeSingle()
              unsub = stored?.token ?? unsub
            }


            const { error: enqErr } = await deliverEmail(supabaseAdmin, {
                message_id: messageId,
                to: therapistEmail,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text,
                purpose: 'transactional',
                label: 'therapist-approved',
                idempotency_key: messageId,
                unsubscribe_token: unsub,
                queued_at: new Date().toISOString(),
              })
            if (enqErr) {
              console.error('[therapist-approve] approval email enqueue failed', enqErr)
              await supabaseAdmin.from('email_send_log').insert({
                message_id: messageId,
                template_name: 'therapist-approved',
                recipient_email: therapistEmail,
                status: 'failed',
                error_message: enqErr.message ?? 'Failed to enqueue email',
              })
            }
          }
        } catch (err) {
          console.error('[therapist-approve] approval email unexpected error', err)
        }

        const link = profile.slug
          ? { href: `${SITE_URL}/therapist/${profile.slug}`, label: 'View the live profile →' }
          : undefined
        return page(
          'Profile approved',
          `<strong>${profile.display_name}</strong> is now live on Veyro and has been emailed to let them know.`,
          { link },
        )
      },
    },
  },
})