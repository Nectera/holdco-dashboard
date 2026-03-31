import { supabase } from '../../lib/supabase.js'

export async function GET() {
  const { data, error } = await supabase
    .from('employees')
    .select('data')
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  }

  const employees = data?.data || []
  return new Response(JSON.stringify(employees), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const { employees } = await request.json()

  const { error } = await supabase
    .from('employees')
    .upsert(
      { id: 1, data: employees, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )

  if (error) {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
}
