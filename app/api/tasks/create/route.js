import { supabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { companyKey, name, lead, status, priority, dueDate, teamMembers, notes } = body

    const companyNames = {
      nectera: 'Nectera Holdings',
      xtract: 'Xtract Environmental Services',
      bcs: 'Bug Control Specialist',
      lush: 'Lush Green Landscapes',
    }

    if (!companyNames[companyKey]) {
      return new Response(JSON.stringify({ error: 'Unknown company' }), { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        company_key: companyKey,
        company: companyNames[companyKey],
        name: name || '',
        lead: lead || '',
        status: status || '',
        priority: priority || '',
        due_date: dueDate || '',
        team_members: teamMembers || '',
        notes: notes || '',
        last_touched: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, task: data }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
