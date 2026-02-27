import Anthropic from '@anthropic-ai/sdk'
import { Redis } from '@upstash/redis'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

const fetchQBData = async (endpoint, params) => {
  const base = process.env.NEXTAUTH_URL || 'https://nexus-orcin-psi.vercel.app'
  const url = `${base}/api/qb/${endpoint}?${params}`
  try {
    const res = await fetch(url)
    return await res.json()
  } catch (err) {
    return { error: err.message }
  }
}

const buildFinancialContext = async (basicContext) => {
  const year = new Date().getFullYear()
  const companies = ['xtract', 'bcs', 'lush']
  const companyNames = { xtract: 'Xtract Environmental Services', bcs: 'Bug Control Specialist', lush: 'Lush Green Landscapes' }

  let detailed = basicContext + '\n\nDETAILED FINANCIAL DATA:\n'

  const results = await Promise.all(companies.map(async (key) => {
    const [details, cashflow, transactions, customers, vendors] = await Promise.all([
      fetchQBData('details', `company=${key}&year=${year}`),
      fetchQBData('cashflow', `company=${key}&year=${year}`),
      fetchQBData('transactions', `company=${key}&type=all&limit=20`),
      fetchQBData('customers', `company=${key}`),
      fetchQBData('vendors', `company=${key}`),
    ])
    return { key, name: companyNames[key], details, cashflow, transactions, customers, vendors }
  }))

  for (const r of results) {
    detailed += `\n--- ${r.name} ---\n`

    if (r.details && r.details.rows) {
      detailed += 'P&L LINE ITEMS:\n'
      for (const row of r.details.rows) {
        if (row.value !== null && row.value !== 0) {
          detailed += `  ${'  '.repeat(row.depth || 0)}${row.label}: $${row.value.toLocaleString()}\n`
        }
      }
    }

    if (r.details && r.details.monthly) {
      detailed += 'MONTHLY TREND:\n'
      for (const m of r.details.monthly) {
        if (m.income > 0 || m.expenses > 0) {
          detailed += `  ${m.month}: Revenue $${m.income.toLocaleString()}, Expenses $${m.expenses.toLocaleString()}, Net $${m.net.toLocaleString()}\n`
        }
      }
    }

    if (r.cashflow && r.cashflow.rows) {
      detailed += 'CASH FLOW:\n'
      for (const row of r.cashflow.rows) {
        if (row.isTotal && row.value !== null) {
          detailed += `  ${row.label}: $${row.value.toLocaleString()}\n`
        }
      }
    }

    if (r.transactions && r.transactions.transactions) {
      const txns = r.transactions.transactions
      const openInvoices = txns.filter(t => t.type === 'Invoice' && t.balance > 0)
      const openBills = txns.filter(t => t.type === 'Bill' && t.balance > 0)
      if (openInvoices.length > 0) {
        detailed += 'OPEN INVOICES:\n'
        for (const inv of openInvoices.slice(0, 10)) {
          detailed += `  #${inv.docNumber || inv.id} - ${inv.customer}: $${inv.amount.toLocaleString()} (balance: $${inv.balance.toLocaleString()}) due ${inv.dueDate} [${inv.status}]\n`
        }
      }
      if (openBills.length > 0) {
        detailed += 'OPEN BILLS:\n'
        for (const bill of openBills.slice(0, 10)) {
          detailed += `  ${bill.vendor}: $${bill.amount.toLocaleString()} (balance: $${bill.balance.toLocaleString()}) due ${bill.dueDate} [${bill.status}]\n`
        }
      }
    }

    if (r.customers) {
      detailed += `CUSTOMERS: ${r.customers.totalCustomers} total, ${r.customers.customersWithBalance} with open balance ($${(r.customers.totalBalance || 0).toLocaleString()} total AR)\n`
      if (r.customers.customers) {
        const topOwing = r.customers.customers.filter(c => c.balance > 0).slice(0, 5)
        if (topOwing.length > 0) {
          detailed += 'TOP CUSTOMERS OWING:\n'
          for (const c of topOwing) {
            detailed += `  ${c.name}: $${c.balance.toLocaleString()}\n`
          }
        }
      }
    }

    if (r.vendors) {
      detailed += `VENDORS: ${r.vendors.totalVendors} total, ${r.vendors.vendorsWithBalance} with open balance ($${(r.vendors.totalBalance || 0).toLocaleString()} total AP)\n`
      if (r.vendors.vendors) {
        const topOwed = r.vendors.vendors.filter(v => v.balance > 0).slice(0, 5)
        if (topOwed.length > 0) {
          detailed += 'TOP VENDORS OWED:\n'
          for (const v of topOwed) {
            detailed += `  ${v.name}: $${v.balance.toLocaleString()}\n`
          }
        }
      }
    }
  }

  return detailed
}

export async function POST(request) {
  const body = await request.json()
  const { messages, context, userId } = body

  const memory = userId ? (await redis.get('nectera:nora_memory:' + userId) || []) : []
  const memoryContext = memory.length > 0 ? '\n\nCONVERSATION MEMORY (previous sessions):\n' + memory.map(m => '- ' + m).join('\n') : ''

  if (userId && messages.length > 0) {
    const recentUserMsgs = messages.filter(m => m.role === 'user').slice(-3).map(m => m.content)
    const newMemory = [...memory, ...recentUserMsgs].slice(-20)
    await redis.set('nectera:nora_memory:' + userId, newMemory)
  }

  const isFinancialQuestion = messages.length > 0 && /financ|revenue|expense|profit|loss|income|cash|money|budget|cost|margin|ar |a\/r|receivable|payable|a\/p|ap |invoice|bill|customer.*owe|vendor|paid|payment|quarterly|monthly trend|biggest expense|top expense|who owes|balance sheet|cash flow/i.test(messages[messages.length - 1].content)

  let financialContext = context.financials || 'No financial data available'
  if (isFinancialQuestion) {
    try {
      financialContext = await buildFinancialContext(financialContext)
    } catch (err) {
      financialContext = context.financials || 'No financial data available'
    }
  }

  const systemPrompt = `You are Nora, an intelligent AI assistant for Nectera Holdings — a holding company that owns Xtract Environmental Services, Bug Control Specialist, and Lush Green Landscapes.

You have access to the following live data from the dashboard:

FINANCIAL SUMMARY:
${financialContext}

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

You are helpful, concise, and professional. You have deep access to QuickBooks financial data including P&L line items, monthly trends, cash flow statements, open invoices, open bills, customer balances, and vendor balances. When asked financial questions, use the detailed data to give specific, precise answers with actual numbers. You can identify top expenses, compare subsidiaries, spot trends, flag overdue invoices, and provide actionable financial insights.

Keep responses concise — 2-4 sentences unless a detailed breakdown is requested. You also have web search capability — use it to find current industry news, market data, regulations, or any information not in the dashboard. Always sign off as Nora.${memoryContext}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: messages,
    })
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
