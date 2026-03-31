import { supabase } from '../../lib/supabase.js'

export async function GET() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify(data || []), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const body = await request.json()

  if (body.action === 'create') {
    const event = {
      title: body.title,
      date: body.date,
      time: body.time || '',
      company: body.company || '',
      notes: body.notes || '',
      assigned_to: body.assignedTo || '',
      created_by: body.createdBy || '',
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([event])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, event: data }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (body.action === 'delete') {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', body.id)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
}
