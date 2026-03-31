import { supabase } from '../../lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return new Response(JSON.stringify({ subtasks: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const { data: record, error } = await supabase
      .from('subtasks')
      .select('data')
      .eq('project_id', projectId)
      .single()

    if (error && error.code === 'PGRST116') {
      return new Response(JSON.stringify({ subtasks: [] }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ subtasks: [] }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ subtasks: record?.data || [] }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ subtasks: [] }), { headers: { 'Content-Type': 'application/json' } })
  }
}

export async function POST(request) {
  try {
    const { projectId, subtasks } = await request.json()

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'No projectId' }), { status: 400 })
    }

    const { data: existing } = await supabase
      .from('subtasks')
      .select('id')
      .eq('project_id', projectId)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('subtasks')
        .update({ data: subtasks })
        .eq('project_id', projectId)

      if (error) {
        console.error('Supabase error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from('subtasks')
        .insert([{ project_id: projectId, data: subtasks }])

      if (error) {
        console.error('Supabase error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
