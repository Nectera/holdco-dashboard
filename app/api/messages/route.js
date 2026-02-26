import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const userId = searchParams.get('userId')

  if (action === 'conversations') {
    const conversations = await redis.get('nectera:conversations') || []
    // Return only conversations this user is part of
    // Coerce userId to match both string and number member IDs
    const userConvos = conversations.filter(c => c.members.some(m => String(m) === String(userId)))
    return new Response(JSON.stringify(userConvos), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'messages') {
    const convoId = searchParams.get('convoId')
    const messages = await redis.get('nectera:messages:' + convoId) || []
    return new Response(JSON.stringify(messages), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'unread') {
    const conversations = await redis.get('nectera:conversations') || []
    const userConvos = conversations.filter(c => c.members.includes(userId))
    let unread = 0
    for (const convo of userConvos) {
      const lastRead = convo.lastRead?.[userId] || 0
      const messages = await redis.get('nectera:messages:' + convo.id) || []
      unread += messages.filter(m => m.timestamp > lastRead && m.senderId !== userId).length
    }
    return new Response(JSON.stringify({ unread }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}

export async function POST(request) {
  const body = await request.json()
  const { action } = body

  if (action === 'create_conversation') {
    const { name, members, type, createdBy } = body
    const conversations = await redis.get('nectera:conversations') || []
    // Check if DM already exists
    if (type === 'dm') {
      const existing = conversations.find(c => c.type === 'dm' && c.members.length === 2 && members.every(m => c.members.includes(m)))
      if (existing) return new Response(JSON.stringify(existing), { headers: { 'Content-Type': 'application/json' } })
    }
    const convo = { id: 'convo_' + Date.now(), name, members, type, createdBy, createdAt: Date.now(), lastMessage: null, lastRead: {} }
    await redis.set('nectera:conversations', [...conversations, convo])
    return new Response(JSON.stringify(convo), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'send_message') {
    const { convoId, senderId, senderName, text } = body
    const messages = await redis.get('nectera:messages:' + convoId) || []
    const message = { id: 'msg_' + Date.now(), convoId, senderId, senderName, text, timestamp: Date.now() }
    await redis.set('nectera:messages:' + convoId, [...messages, message])
    // Update conversation last message
    const conversations = await redis.get('nectera:conversations') || []
    const updated = conversations.map(c => c.id === convoId ? { ...c, lastMessage: { text, senderName, timestamp: Date.now() } } : c)
    await redis.set('nectera:conversations', updated)
    return new Response(JSON.stringify(message), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'mark_read') {
    const { convoId, userId } = body
    const conversations = await redis.get('nectera:conversations') || []
    const updated = conversations.map(c => c.id === convoId ? { ...c, lastRead: { ...c.lastRead, [userId]: Date.now() } } : c)
    await redis.set('nectera:conversations', updated)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'delete_conversation') {
    const { convoId, userId } = body
    const conversations = await redis.get('nectera:conversations') || []
    const updated = conversations.filter(c => c.id !== convoId)
    await redis.set('nectera:conversations', updated)
    await redis.del('nectera:messages:' + convoId)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
