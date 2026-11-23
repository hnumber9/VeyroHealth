import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'crypto'

type CalcomWebhookBody = {
  triggerEvent?: string
  payload?: {
    uid?: string
    bookingId?: number
    cancellationReason?: string
    cancelledBy?: string
    rescheduleUid?: string
    rescheduledFromUid?: string

    rescheduleId?: number
    rescheduledBy?: string
    rescheduleReason?: string
    startTime?: string
    endTime?: string
    metadata?: { videoCallUrl?: string }
    attendees?: Array<{ email?: string; name?: string }>
  }
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const given = signature.trim().toLowerCase()
  if (given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

export const Route = createFileRoute('/api/public/calcom/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['CALCOM_WEBHOOK_SECRET']
        const rawBody = await request.text()

        if (!secret) {
          console.error('[calcom:webhook] CALCOM_WEBHOOK_SECRET is not configured')
          return new Response('Not configured', { status: 500 })
        }
        if (!verifySignature(rawBody, request.headers.get('x-cal-signature-256'), secret)) {
          return new Response('Invalid signature', { status: 401 })
        }

        let body: CalcomWebhookBody
        try {
          body = JSON.parse(rawBody)
        } catch {
          return new Response('Invalid JSON', { status: 400 })
        }

        const trigger = body.triggerEvent ?? ''
        if (!['BOOKING_CANCELLED', 'BOOKING_REJECTED', 'BOOKING_RESCHEDULED'].includes(trigger)) {
          return new Response('ok')
        }

        const uid = body.payload?.uid
        // Cal.com names the original booking differently across API versions.
        const previousUid = body.payload?.rescheduleUid ?? body.payload?.rescheduledFromUid
        if (!uid && !previousUid) return new Response('ok')

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        if (trigger === 'BOOKING_RESCHEDULED') {
          const lookupUids = [
            body.payload?.rescheduleUid,
            body.payload?.rescheduledFromUid,
            uid,
          ].filter(Boolean) as string[]
          const { data: existing } = await supabaseAdmin
            .from('appointments')
            .select('id, starts_at, ends_at')
            .in('calcom_booking_uid', lookupUids)
            .limit(1)
          const target = existing?.[0]
          if (!target) {
            console.warn('[calcom:webhook] no appointment to reschedule', lookupUids)
            return new Response('ok')
          }

          const startTime = body.payload?.startTime
          const endTime = body.payload?.endTime
          if (!startTime || !endTime) return new Response('ok')

          const previousStartsAt = target.starts_at
          const previousEndsAt = target.ends_at

          await supabaseAdmin
            .from('appointments')
            .update({
              starts_at: new Date(startTime).toISOString(),
              ends_at: new Date(endTime).toISOString(),
              status: 'confirmed',
              ...(uid ? { calcom_booking_uid: uid } : {}),
              ...(body.payload?.metadata?.videoCallUrl
                ? { meeting_url: body.payload.metadata.videoCallUrl }
                : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('id', target.id)

          try {
            const { sendBookingRescheduleForAppointment } = await import(
              '@/lib/send-booking-reschedule.server'
            )
            await sendBookingRescheduleForAppointment(target.id, {
              previousStartsAt,
              previousEndsAt,
              rescheduleReason: body.payload?.rescheduleReason ?? null,
            })
          } catch (err) {
            console.error('[calcom:webhook] reschedule email failed', err)
          }

          return new Response('ok')
        }

        const { data: appt } = await supabaseAdmin
          .from('appointments')
          .select('id, status')
          .eq('calcom_booking_uid', uid!)
          .maybeSingle()

        if (!appt) {
          console.warn('[calcom:webhook] no appointment for booking uid', uid)
          return new Response('ok')
        }

        if (appt.status !== 'cancelled') {
          await supabaseAdmin
            .from('appointments')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', appt.id)
        }

        try {
          const { sendBookingCancellationForAppointment } = await import(
            '@/lib/send-booking-cancellation.server'
          )
          await sendBookingCancellationForAppointment(
            appt.id,
            body.payload?.cancellationReason ?? null,
          )
        } catch (err) {
          console.error('[calcom:webhook] cancellation email failed', err)
        }

        return new Response('ok')
      },
    },
  },
})