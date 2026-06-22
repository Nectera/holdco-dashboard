import { supabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const { id, companyKey, rowIndex } = await request.json()

    // Support both id-based (new) and rowIndex-based (legacy) deletes
    if (id) {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    } else {
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('company_key', companyKey)
        .order('created_at', { ascending: true })

      if (!allTasks || !allTasks[rowIndex]) {
        return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 })
      }

      const { error } = await supabase.from('tasks').delete().eq('id', allTasks[rowIndex].id)
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
