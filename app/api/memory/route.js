import { supabase } from '../../lib/supabase.js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return new Response(JSON.stringify({ memories: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  const { data, error } = await supabase
    .from('ai_memories')
    .select('fact, date')
    .eq('user_id', parseInt(userId))
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify({ memories: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  const memories = (data || []).map(m => ({ fact: m.fact, date: m.date }))
  return new Response(JSON.stringify({ memories }), { headers: { 'Content-Type': 'application/json' } })
}

export async function POST(request) {
  const { userId, action, memoryIndex, fact, date } = await request.json()

  if (!userId) {
    return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 })
  }

  if (action === 'clear') {
    const { error } = await supabase
      .from('ai_memories')
      .delete()
      .eq('user_id', parseInt(userId))

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, memories: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (action === 'delete' && typeof memoryIndex === 'number') {
    const { data: allMemories, error: selectError } = await supabase
      .from('ai_memories')
      .select('id')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false })

    if (selectError) {
      console.error('Supabase error:', selectError)
      return new Response(JSON.stringify({ error: selectError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    if (memoryIndex >= 0 && memoryIndex < (allMemories?.length || 0)) {
      const memoryToDelete = allMemories[memoryIndex]
      const { error: deleteError } = await supabase
        .from('ai_memories')
        .delete()
        .eq('id', memoryToDelete.id)

      if (deleteError) {
        console.error('Supabase error:', deleteError)
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
    }

    const { data: remainingMemories } = await supabase
      .from('ai_memories')
      .select('fact, date')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false })

    const memories = (remainingMemories || []).map(m => ({ fact: m.fact, date: m.date }))
    return new Response(JSON.stringify({ success: true, memories }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
}
