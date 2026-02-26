import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export async function POST(request) {
  const body = await request.json()
  const { messages, context } = body

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

You are helpful, concise, and professional. You can answer questions about any of the above data, identify trends, flag issues, and provide summaries. When referencing specific numbers or data, be precise. If data is unavailable, say so clearly. Keep responses concise — 2-4 sentences unless a detailed breakdown is requested. Always sign off as Nora.`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })
    return new Response(JSON.stringify({ reply: response.content[0].text }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch(err) {
    console.error('AI error:', err.message)
    return new Response(JSON.stringify({ reply: 'Error: ' + err.message }), {
      headers: { 'Content-Type': 'application/json' }, status: 500
    })
  }
}
