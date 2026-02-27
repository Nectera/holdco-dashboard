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

const findRowValue = (rows, labelMatch) => {
  if (!rows) return 0
  for (const row of rows) {
    if (row.label && row.label.toLowerCase().includes(labelMatch.toLowerCase()) && row.value !== null) {
      return row.value
    }
  }
  return 0
}

const calcMetrics = (rows) => {
  const totalIncome = findRowValue(rows, 'Total Income')
  const totalCOGS = findRowValue(rows, 'Total Cost of Goods Sold')
  const grossProfit = totalIncome - totalCOGS
  const totalExpenses = findRowValue(rows, 'Total Expenses')
  const netIncome = findRowValue(rows, 'Net Income') || (grossProfit - totalExpenses)
  const depreciation = findRowValue(rows, 'Depreciation') + findRowValue(rows, 'Amortization')
  const interest = findRowValue(rows, 'Interest Expense')
  const taxes = findRowValue(rows, 'Tax') + findRowValue(rows, 'Income Tax')
  const ebitda = netIncome + interest + taxes + depreciation
  const grossMargin = totalIncome > 0 ? ((grossProfit / totalIncome) * 100).toFixed(1) : '0.0'
  const netMargin = totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : '0.0'
  const operatingMargin = totalIncome > 0 ? (((grossProfit - totalExpenses) / totalIncome) * 100).toFixed(1) : '0.0'
  return { totalIncome, totalCOGS, grossProfit, totalExpenses, netIncome, depreciation, interest, taxes, ebitda, grossMargin, netMargin, operatingMargin }
}

const buildFinancialContext = async (basicContext, year) => {
  if (!year) year = new Date().getFullYear()
  const priorYear = year - 1
  const companies = ['xtract', 'bcs', 'lush']
  const companyNames = { xtract: 'Xtract Environmental Services', bcs: 'Bug Control Specialist', lush: 'Lush Green Landscapes' }

  let detailed = basicContext + '\n\nDETAILED FINANCIAL DATA:\n'

  const results = await Promise.all(companies.map(async (key) => {
    const [details, priorDetails, balanceSheet, cashflow, transactions, customers, vendors] = await Promise.all([
      fetchQBData('details', `company=${key}&year=${year}`),
      fetchQBData('details', `company=${key}&year=${priorYear}`),
      fetchQBData('report', `company=${key}&type=bs&year=${year}`),
      fetchQBData('cashflow', `company=${key}&year=${year}`),
      fetchQBData('transactions', `company=${key}&type=all&limit=20`),
      fetchQBData('customers', `company=${key}`),
      fetchQBData('vendors', `company=${key}`),
    ])
    return { key, name: companyNames[key], details, priorDetails, balanceSheet, cashflow, transactions, customers, vendors }
  }))

  for (const r of results) {
    detailed += `\n--- ${r.name} ---\n`

    const currentMetrics = calcMetrics(r.details && r.details.rows ? r.details.rows : [])
    const priorMetrics = calcMetrics(r.priorDetails && r.priorDetails.rows ? r.priorDetails.rows : [])

    detailed += `KEY METRICS (${year}):\n`
    detailed += `  Revenue: $${currentMetrics.totalIncome.toLocaleString()}\n`
    detailed += `  COGS: $${currentMetrics.totalCOGS.toLocaleString()}\n`
    detailed += `  Gross Profit: $${currentMetrics.grossProfit.toLocaleString()} (${currentMetrics.grossMargin}% margin)\n`
    detailed += `  Operating Expenses: $${currentMetrics.totalExpenses.toLocaleString()}\n`
    detailed += `  Net Income: $${currentMetrics.netIncome.toLocaleString()} (${currentMetrics.netMargin}% margin)\n`
    detailed += `  EBITDA: $${currentMetrics.ebitda.toLocaleString()}\n`
    detailed += `  Operating Margin: ${currentMetrics.operatingMargin}%\n`
    detailed += `  Interest Expense: $${currentMetrics.interest.toLocaleString()}\n`
    detailed += `  Depreciation: $${currentMetrics.depreciation.toLocaleString()}\n`

    if (priorMetrics.totalIncome > 0) {
      const revenueGrowth = (((currentMetrics.totalIncome - priorMetrics.totalIncome) / priorMetrics.totalIncome) * 100).toFixed(1)
      const netGrowth = priorMetrics.netIncome !== 0 ? (((currentMetrics.netIncome - priorMetrics.netIncome) / Math.abs(priorMetrics.netIncome)) * 100).toFixed(1) : 'N/A'
      detailed += `YEAR-OVER-YEAR (${priorYear} vs ${year}):\n`
      detailed += `  Prior Revenue: $${priorMetrics.totalIncome.toLocaleString()} -> Current: $${currentMetrics.totalIncome.toLocaleString()} (${revenueGrowth}% change)\n`
      detailed += `  Prior Net Income: $${priorMetrics.netIncome.toLocaleString()} -> Current: $${currentMetrics.netIncome.toLocaleString()} (${netGrowth}% change)\n`
      detailed += `  Prior Gross Margin: ${priorMetrics.grossMargin}% -> Current: ${currentMetrics.grossMargin}%\n`
      detailed += `  Prior EBITDA: $${priorMetrics.ebitda.toLocaleString()} -> Current: $${currentMetrics.ebitda.toLocaleString()}\n`
    }

    if (r.details && r.details.rows) {
      detailed += 'P&L LINE ITEMS:\n'
      for (const row of r.details.rows) {
        if (row.value !== null && row.value !== 0) {
          const indent = '  '.repeat((row.depth || 0) + 1)
          detailed += `${indent}${row.label}: $${row.value.toLocaleString()}\n`
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

    if (r.balanceSheet && r.balanceSheet.rows) {
      detailed += 'BALANCE SHEET:\n'
      for (const row of r.balanceSheet.rows) {
        if (row.value !== null && (row.isTotal || row.depth <= 1)) {
          const indent = '  '.repeat((row.depth || 0) + 1)
          detailed += `${indent}${row.label}: $${row.value.toLocaleString()}\n`
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
      const openInvoices = txns.filter(function(t) { return t.type === 'Invoice' && t.balance > 0 })
      const openBills = txns.filter(function(t) { return t.type === 'Bill' && t.balance > 0 })
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
        const topOwing = r.customers.customers.filter(function(c) { return c.balance > 0 }).slice(0, 5)
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
        const topOwed = r.vendors.vendors.filter(function(v) { return v.balance > 0 }).slice(0, 5)
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

  const lastMsg = messages.length > 0 ? messages[messages.length - 1].content : ''
  const isFinancialQuestion = /financ|revenue|expense|profit|loss|income|cash|money|budget|cost|margin|ebitda|earning|ar |a\/r|receivable|payable|a\/p|ap |invoice|bill|customer.*owe|vendor|paid|payment|quarterly|monthly trend|biggest expense|top expense|who owes|balance sheet|cash flow|assets|liabilities|equity|debt|loan|yoy|year.over.year|compar/i.test(lastMsg)

  const yearMatch = lastMsg.match(/(202[0-9])/);
  const queryYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

  const multiYearMatch = lastMsg.match(/(\d+)\s*year/i)
  const wantsMultiYear = multiYearMatch || /running|trend|history|historical|over time|year.over|annual|every year|all years|past \d/i.test(lastMsg)
  const numYears = multiYearMatch ? Math.min(parseInt(multiYearMatch[1]), 7) : (wantsMultiYear ? 5 : 0)

  const basicContext = context.financials || 'No financial data available'
  let financialContext = basicContext
  if (isFinancialQuestion) {
    try {
      if (numYears > 1) {
        const endYear = queryYear || new Date().getFullYear()
        const startYear = endYear - numYears + 1
        let multiYearData = basicContext + '\n\nMULTI-YEAR FINANCIAL DATA:\n'
        for (let y = startYear; y <= endYear; y++) {
          const yearResults = await Promise.all(['xtract', 'bcs', 'lush'].map(async (key) => {
            const details = await fetchQBData('details', `company=${key}&year=${y}`)
            return { key, details }
          }))
          multiYearData += `\n=== YEAR ${y} ===\n`
          const names = { xtract: 'Xtract Environmental Services', bcs: 'Bug Control Specialist', lush: 'Lush Green Landscapes' }
          for (const r of yearResults) {
            const metrics = calcMetrics(r.details && r.details.rows ? r.details.rows : [])
            multiYearData += `${names[r.key]} (${y}): Revenue $${metrics.totalIncome.toLocaleString()}, COGS $${metrics.totalCOGS.toLocaleString()}, Gross Profit $${metrics.grossProfit.toLocaleString()} (${metrics.grossMargin}%), Net Income $${metrics.netIncome.toLocaleString()} (${metrics.netMargin}%), EBITDA $${metrics.ebitda.toLocaleString()}\n`
          }
        }
        financialContext = multiYearData
      } else {
        financialContext = await buildFinancialContext(financialContext, queryYear)
      }
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
