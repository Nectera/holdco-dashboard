import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export async function GET() {
  const events = await redis.get('nectera:calendar_events') || []
  return new Response(JSON.stringify(events), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const body = await request.json()
  const events = await redis.get('nectera:calendar_events') || []

  if (body.action === 'create') {
    const event = {
      id: Date.now(),
      title: body.title,
      date: body.date,
      time: body.time || '',
      company: body.company || '',
      notes: body.notes || '',
      assignedTo: body.assignedTo || '',
      createdBy: body.createdBy || '',
    }
    await redis.set('nectera:calendar_events', [...events, event])
    return new Response(JSON.stringify({ success: true, event }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (body.action === 'delete') {
    const updated = events.filter(e => e.id !== body.id)
    await redis.set('nectera:calendar_events', updated)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
