import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export async function GET() {
  const tasks = await redis.get('nectera:lighttasks') || []
  return new Response(JSON.stringify(tasks), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const { tasks } = await request.json()
  await redis.set('nectera:lighttasks', tasks)
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
}
