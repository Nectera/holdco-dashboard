import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')
  if (company) {
    const notes = await redis.get('nectera:notes:' + company) || []
    return new Response(JSON.stringify(notes), { headers: { 'Content-Type': 'application/json' } })
  }
  // Return all companies
  const companies = ['Nectera Holdings', 'Xtract Environmental Services', 'Bug Control Specialist', 'Lush Green Landscapes']
  const all = {}
  for (const co of companies) {
    all[co] = await redis.get('nectera:notes:' + co) || []
  }
  return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const { company, notes } = await request.json()
  await redis.set('nectera:notes:' + company, notes)
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
}
