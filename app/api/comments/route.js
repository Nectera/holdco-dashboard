import { supabase } from '../../lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  }

  const { data: comments, error } = await supabase
    .from('project_comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify(comments || []), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const body = await request.json()
  const { projectId, action } = body

  if (!projectId) {
    return new Response(JSON.stringify({ error: 'No projectId' }), { status: 400 })
  }

  if (action === 'add') {
    const comment = {
      project_id: projectId,
      text: body.text,
      author: body.author,
      author_id: body.authorId,
      reactions: {},
      attachments: body.attachments || []
    }

    const { data: inserted, error } = await supabase
      .from('project_comments')
      .insert([comment])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, comment: inserted[0] }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'react') {
    const { data: comment } = await supabase
      .from('project_comments')
      .select('*')
      .eq('id', body.commentId)
      .single()

    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), { status: 404 })
    }

    const reactions = { ...comment.reactions }
    if (!reactions[body.emoji]) {
      reactions[body.emoji] = []
    }

    if (reactions[body.emoji].includes(body.userId)) {
      reactions[body.emoji] = reactions[body.emoji].filter(id => id !== body.userId)
      if (reactions[body.emoji].length === 0) {
        delete reactions[body.emoji]
      }
    } else {
      reactions[body.emoji] = [...reactions[body.emoji], body.userId]
    }

    const { error } = await supabase
      .from('project_comments')
      .update({ reactions })
      .eq('id', body.commentId)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('project_comments')
      .delete()
      .eq('id', body.commentId)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
