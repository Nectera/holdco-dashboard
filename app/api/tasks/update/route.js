import { supabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { id, companyKey, rowIndex, field, value } = body

    const fieldMap = {
      status: 'status',
      priority: 'priority',
      dueDate: 'due_date',
      teamMembers: 'team_members',
      notes: 'notes',
      lead: 'lead',
      name: 'name',
    }

    const dbField = fieldMap[field]
    if (!dbField) return new Response(JSON.stringify({ error: 'Unknown field' }), { status: 400 })

    const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

    // Support both id-based (new) and rowIndex-based (legacy) updates
    let query
    if (id) {
      query = supabase.from('tasks').update({ [dbField]: value, last_touched: today }).eq('id', id)
    } else {
      // Fallback: find by companyKey and offset
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('company_key', companyKey)
        .order('created_at', { ascending: true })

      if (!allTasks || !allTasks[rowIndex]) {
        return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 })
      }
      query = supabase.from('tasks').update({ [dbField]: value, last_touched: today }).eq('id', allTasks[rowIndex].id)
    }

    const { error } = await query
    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
