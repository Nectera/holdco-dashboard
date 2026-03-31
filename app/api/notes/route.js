import { supabase } from '../../lib/supabase.js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')

  if (company) {
    const { data, error } = await supabase
      .from('notes')
      .select('content')
      .eq('company', company)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
    }

    const notes = data?.content || []
    return new Response(JSON.stringify(notes), { headers: { 'Content-Type': 'application/json' } })
  }

  // Return all companies
  const companies = ['Nectera Holdings', 'Xtract Environmental Services', 'Bug Control Specialist', 'Lush Green Landscapes']
  const all = {}

  for (const co of companies) {
    const { data, error } = await supabase
      .from('notes')
      .select('content')
      .eq('company', co)
      .single()

    all[co] = (data?.content || [])
  }

  return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const { company, notes } = await request.json()

  const { error } = await supabase
    .from('notes')
    .upsert(
      { company, content: notes, updated_at: new Date().toISOString() },
      { onConflict: 'company' }
    )

  if (error) {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
}
