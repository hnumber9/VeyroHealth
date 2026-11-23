import { createFileRoute } from '@tanstack/react-router'

async function handle({ request }: { request: Request }) {
  const signingKey = process.env['INNGEST_SIGNING_KEY']
  if (!signingKey) return new Response('Scheduler not configured', { status: 503 })
  // Inngest verifies the signed POST/PUT before any workflow code can run.
  const { serve } = await import('inngest/edge')
  const { createReviewReminderWorkflow } = await import('@/lib/review-reminder.server')
  return serve({ ...createReviewReminderWorkflow(signingKey), servePath: '/api/public/inngest' })(request)
}

export const Route = createFileRoute('/api/public/inngest')({
  server: { handlers: { GET: handle, POST: handle, PUT: handle } },
})