import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export async function GET() {
  const employees = await redis.get('nectera:employees') || []
  return new Response(JSON.stringify(employees), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const { employees } = await request.json()
  await redis.set('nectera:employees', employees)
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
}
