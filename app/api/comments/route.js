import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  const comments = await redis.get('nectera:comments:' + projectId) || []
  return new Response(JSON.stringify(comments), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const body = await request.json()
  const { projectId, action } = body
  if (!projectId) return new Response(JSON.stringify({ error: 'No projectId' }), { status: 400 })
  const key = 'nectera:comments:' + projectId
  const comments = await redis.get(key) || []

  if (action === 'add') {
    const comment = {
      id: Date.now(),
      text: body.text,
      author: body.author,
      authorId: body.authorId,
      createdAt: new Date().toISOString(),
      reactions: {},
      attachments: body.attachments || [],
    }
    await redis.set(key, [...comments, comment])
    return new Response(JSON.stringify({ success: true, comment }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'react') {
    const updated = comments.map(c => {
      if (c.id !== body.commentId) return c
      const reactions = { ...c.reactions }
      if (!reactions[body.emoji]) reactions[body.emoji] = []
      if (reactions[body.emoji].includes(body.userId)) {
        reactions[body.emoji] = reactions[body.emoji].filter(id => id !== body.userId)
        if (reactions[body.emoji].length === 0) delete reactions[body.emoji]
      } else {
        reactions[body.emoji] = [...reactions[body.emoji], body.userId]
      }
      return { ...c, reactions }
    })
    await redis.set(key, updated)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'delete') {
    const updated = comments.filter(c => c.id !== body.commentId)
    await redis.set(key, updated)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
