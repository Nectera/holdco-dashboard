import { supabase } from '../../lib/supabase.js'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('data')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } })
    }

    const goals = data?.data || {}
    return new Response(JSON.stringify(goals), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    const { error } = await supabase
      .from('goals')
      .upsert(
        { id: 1, data: body, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
