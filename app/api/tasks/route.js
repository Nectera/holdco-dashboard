import { supabase } from '../../lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company') || 'all'

  try {
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

    if (company !== 'all') {
      query = query.eq('company_key', company)
    }

    const { data, error } = await query
    if (error) throw error

    const tasks = (data || []).map(row => ({
      id: row.id,
      company: row.company,
      companyKey: row.company_key,
      name: row.name || '',
      lead: row.lead || '',
      status: row.status || '',
      priority: row.priority || '',
      dueDate: row.due_date || '',
      teamMembers: row.team_members || '',
      lastTouched: row.last_touched || '',
      notes: row.notes || '',
    }))

    return new Response(JSON.stringify({ tasks }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ tasks: [], error: err.message }), {
      headers: { 'content-type': 'application/json' },
    })
  }
}
