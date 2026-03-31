import { supabase } from '../../lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return new Response(JSON.stringify({ attachments: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const { data: attachments, error } = await supabase
      .from('project_attachments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ attachments: [] }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ attachments: attachments || [] }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ attachments: [] }), { headers: { 'Content-Type': 'application/json' } })
  }
}

export async function POST(request) {
  try {
    const { projectId, attachments } = await request.json()

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'No projectId' }), { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('project_attachments')
      .delete()
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('Supabase delete error:', deleteError)
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 })
    }

    if (attachments && attachments.length > 0) {
      const insertData = attachments.map(a => ({
        project_id: projectId,
        url: a.url,
        name: a.name,
        size: a.size,
        type: a.type,
        uploaded_by: a.uploaded_by
      }))

      const { error: insertError } = await supabase
        .from('project_attachments')
        .insert(insertData)

      if (insertError) {
        console.error('Supabase insert error:', insertError)
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
