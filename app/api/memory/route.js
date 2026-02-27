import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
})

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ memories: [] }), { headers: { 'Content-Type': 'application/json' } })
  
  const memories = await redis.get('nectera:nora_memory_v2:' + userId) || []
  return new Response(JSON.stringify({ memories }), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const { userId, action, memoryIndex } = await request.json()
  if (!userId) return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 })

  if (action === 'clear') {
    await redis.del('nectera:nora_memory_v2:' + userId)
    return new Response(JSON.stringify({ success: true, memories: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'delete' && typeof memoryIndex === 'number') {
    const memories = await redis.get('nectera:nora_memory_v2:' + userId) || []
    memories.splice(memoryIndex, 1)
    await redis.set('nectera:nora_memory_v2:' + userId, memories)
    return new Response(JSON.stringify({ success: true, memories }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
}
