import { supabase } from '../../lib/supabase.js'

export async function GET() {
  const { data, error } = await supabase
    .from('light_tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify(data || []), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const { tasks } = await request.json()

  const { error: deleteError } = await supabase
    .from('light_tasks')
    .delete()
    .neq('id', 0)

  if (deleteError) {
    console.error('Supabase delete error:', deleteError)
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  if (tasks && tasks.length > 0) {
    const { error: insertError } = await supabase
      .from('light_tasks')
      .insert(tasks)

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
}
