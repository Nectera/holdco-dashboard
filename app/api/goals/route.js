import { Redis } from '@upstash/redis'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

const GOALS_KEY = 'nectera:goals'

export async function GET() {
  try {
    const goals = await redis.get(GOALS_KEY) || {}
    return new Response(JSON.stringify(goals), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    await redis.set(GOALS_KEY, body)
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
