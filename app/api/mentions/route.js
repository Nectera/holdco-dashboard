import { supabase } from '../../lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  }

  const { data, error } = await supabase
    .from('mention_notifications')
    .select('*')
    .eq('mentioned_user_id', parseInt(userId))
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify(data || []), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const body = await request.json()
  const { action } = body

  if (action === 'create') {
    const { error } = await supabase
      .from('mention_notifications')
      .insert([{
        mentioned_user_id: parseInt(body.mentionedUserId),
        mentioned_by_name: body.mentionedByName,
        mentioned_by_id: parseInt(body.mentionedById),
        project_name: body.projectName,
        project_id: body.projectId,
        comment_text: body.commentText,
        is_read: false
      }])

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'mark_read') {
    const { error } = await supabase
      .from('mention_notifications')
      .update({ is_read: true })
      .eq('id', body.notificationId)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'mark_all_read') {
    const { error } = await supabase
      .from('mention_notifications')
      .update({ is_read: true })
      .eq('mentioned_user_id', parseInt(body.userId))
      .eq('is_read', false)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'dismiss') {
    const { error } = await supabase
      .from('mention_notifications')
      .delete()
      .eq('id', body.notificationId)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
