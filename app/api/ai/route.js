import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

export async function POST(request) {
  const body = await request.json()
  const { messages, context, userId } = body

  // Load memory for this user
  const memory = userId ? (await redis.get('nectera:nora_memory:' + userId) || []) : []
  const memoryContext = memory.length > 0 ? '\n\nCONVERSATION MEMORY (previous sessions):\n' + memory.map(m => '- ' + m).join('\n') : ''

  // Save recent user messages to memory
  if (userId && messages.length > 0) {
    const recentUserMsgs = messages.filter(m => m.role === 'user').slice(-3).map(m => m.content)
    const newMemory = [...memory, ...recentUserMsgs].slice(-20)
    await redis.set('nectera:nora_memory:' + userId, newMemory)
  }

  const systemPrompt = `You are Nora, an intelligent AI assistant for Nectera Holdings — a holding company that owns Xtract Environmental Services, Bug Control Specialist, and Lush Green Landscapes.

You have access to the following live data from the dashboard:

FINANCIAL SUMMARY:
${context.financials || 'No financial data available'}

PROJECTS (from Google Sheets):
${context.projects || 'No projects data available'}

TASKS:
${context.tasks || 'No tasks data available'}

TEAM DIRECTORY:
${context.team || 'No team data available'}

NOTES SUMMARY:
${context.notes || 'No notes available'}

UPCOMING CALENDAR EVENTS:
${context.calendar || 'No calendar events available'}

You are helpful, concise, and professional. You can answer questions about any of the above data, identify trends, flag issues, and provide summaries. When referencing specific numbers or data, be precise. If data is unavailable, say so clearly. Keep responses concise — 2-4 sentences unless a detailed breakdown is requested. You also have web search capability — use it to find current industry news, market data, regulations, or any information not in the dashboard. Always sign off as Nora.${memoryContext}`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: messages,
    })
    // Extract text from response (may include tool use blocks)
    const textContent = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
    const reply = textContent || "I searched for that but couldn't find a clear answer."
    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch(err) {
    console.error('AI error:', err.message)
    return new Response(JSON.stringify({ reply: 'Error: ' + err.message }), {
      headers: { 'Content-Type': 'application/json' }, status: 500
    })
  }
}
