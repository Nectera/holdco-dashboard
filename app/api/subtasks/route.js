import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return new Response(JSON.stringify({ subtasks: [] }), { headers: { 'Content-Type': 'application/json' } })
  
  try {
    const data = await redis.get(`subtasks:${projectId}`)
    return new Response(JSON.stringify({ subtasks: data || [] }), { headers: { 'Content-Type': 'application/json' } })
  } catch(e) {
    return new Response(JSON.stringify({ subtasks: [] }), { headers: { 'Content-Type': 'application/json' } })
  }
}

export async function POST(request) {
  try {
    const { projectId, subtasks } = await request.json()
    if (!projectId) return new Response(JSON.stringify({ error: 'No projectId' }), { status: 400 })
    
    await redis.set(`subtasks:${projectId}`, subtasks)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
