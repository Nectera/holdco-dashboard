import { supabase } from '../../lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const userId = searchParams.get('userId')

  if (action === 'conversations') {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
    }

    const userConvos = conversations.filter(c =>
      c.members && c.members.some(m => String(m) === String(userId))
    )

    return new Response(JSON.stringify(userConvos), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'messages') {
    const convoId = searchParams.get('convoId')
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('convo_id', convoId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify(messages || []), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'unread') {
    const { data: conversations, error: convoError } = await supabase
      .from('conversations')
      .select('*')

    if (convoError) {
      console.error('Supabase error:', convoError)
      return new Response(JSON.stringify({ unread: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    const userConvos = conversations.filter(c =>
      c.members && c.members.some(m => String(m) === String(userId))
    )

    let unread = 0
    for (const convo of userConvos) {
      const lastRead = convo.last_read && convo.last_read[userId] ? convo.last_read[userId] : 0
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('convo_id', convo.id)

      if (!msgError && messages) {
        unread += messages.filter(m => m.timestamp > lastRead && m.sender_id !== parseInt(userId)).length
      }
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

    if (type === 'dm') {
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('type', 'dm')

      if (existing) {
        const existingConvo = existing.find(c =>
          c.members && c.members.length === 2 &&
          members.every(m => c.members.includes(m))
        )
        if (existingConvo) {
          return new Response(JSON.stringify(existingConvo), { headers: { 'Content-Type': 'application/json' } })
        }
      }
    }

    const convoId = 'convo_' + Date.now()
    const newConvo = {
      id: convoId,
      name,
      type,
      members,
      created_by: createdBy,
      created_at: Date.now(),
      last_message: {},
      last_read: {}
    }

    const { data: inserted, error } = await supabase
      .from('conversations')
      .insert([newConvo])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify(inserted[0]), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'send_message') {
    const { convoId, senderId, senderName, text } = body

    const messageId = 'msg_' + Date.now()
    const message = {
      id: messageId,
      convo_id: convoId,
      sender_id: senderId,
      sender_name: senderName,
      text,
      timestamp: Date.now()
    }

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert([message])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    const { data: convo } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', convoId)
      .single()

    const updatedConvo = {
      ...convo,
      last_message: { text, sender_name: senderName, timestamp: Date.now() }
    }

    await supabase
      .from('conversations')
      .update(updatedConvo)
      .eq('id', convoId)

    return new Response(JSON.stringify(inserted[0]), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'mark_read') {
    const { convoId, userId } = body

    const { data: convo } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', convoId)
      .single()

    const updatedLastRead = convo.last_read || {}
    updatedLastRead[userId] = Date.now()

    const { error } = await supabase
      .from('conversations')
      .update({ last_read: updatedLastRead })
      .eq('id', convoId)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'delete_conversation') {
    const { convoId } = body

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', convoId)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
