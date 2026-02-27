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
      const curMonthly = r.details && r.details.monthly ? r.details.monthly : []
      const priorMonthly = r.priorDetails && r.priorDetails.monthly ? r.priorDetails.monthly : []
      const activeMonths = curMonthly.filter(function(m) { return m.income > 0 || m.expenses > 0 }).length
      const isPartialYear = activeMonths < 12 && activeMonths > 0

      if (isPartialYear && priorMonthly.length >= activeMonths) {
        const priorSlice = priorMonthly.slice(0, activeMonths)
        const priorYTDRevenue = priorSlice.reduce(function(s, m) { return s + (m.income || 0) }, 0)
        const priorYTDNet = priorSlice.reduce(function(s, m) { return s + (m.net || 0) }, 0)
        const curYTDRevenue = currentMetrics.totalIncome
        const curYTDNet = currentMetrics.netIncome
        const revGrowth = priorYTDRevenue > 0 ? (((curYTDRevenue - priorYTDRevenue) / priorYTDRevenue) * 100).toFixed(1) : 'N/A'
        const netGrowth = priorYTDNet !== 0 ? (((curYTDNet - priorYTDNet) / Math.abs(priorYTDNet)) * 100).toFixed(1) : 'N/A'
        const monthNames = curMonthly.filter(function(m) { return m.income > 0 || m.expenses > 0 }).map(function(m) { return m.month })
        const periodLabel = monthNames.length > 0 ? monthNames[0] + '-' + monthNames[monthNames.length - 1] : 'YTD'
        detailed += `YTD COMPARISON (${periodLabel} ${priorYear} vs ${periodLabel} ${year}):\n`
        detailed += `  Prior YTD Revenue: $${priorYTDRevenue.toLocaleString()} -> Current YTD: $${curYTDRevenue.toLocaleString()} (${revGrowth}% change)\n`
        detailed += `  Prior YTD Net Income: $${priorYTDNet.toLocaleString()} -> Current YTD: $${curYTDNet.toLocaleString()} (${netGrowth}% change)\n`
      } else {
        const revenueGrowth = (((currentMetrics.totalIncome - priorMetrics.totalIncome) / priorMetrics.totalIncome) * 100).toFixed(1)
        const netGrowth = priorMetrics.netIncome !== 0 ? (((currentMetrics.netIncome - priorMetrics.netIncome) / Math.abs(priorMetrics.netIncome)) * 100).toFixed(1) : 'N/A'
        detailed += `YEAR-OVER-YEAR (${priorYear} vs ${year}):\n`
        detailed += `  Prior Revenue: $${priorMetrics.totalIncome.toLocaleString()} -> Current: $${currentMetrics.totalIncome.toLocaleString()} (${revenueGrowth}% change)\n`
        detailed += `  Prior Net Income: $${priorMetrics.netIncome.toLocaleString()} -> Current: $${currentMetrics.netIncome.toLocaleString()} (${netGrowth}% change)\n`
        detailed += `  Prior Gross Margin: ${priorMetrics.grossMargin}% -> Current: ${currentMetrics.grossMargin}%\n`
        detailed += `  Prior EBITDA: $${priorMetrics.ebitda.toLocaleString()} -> Current: $${currentMetrics.ebitda.toLocaleString()}\n`
      }
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
            if (r.details && r.details.monthly) {
              const months = r.details.monthly
              const q1 = months.filter(function(m) { return m.month && (m.month.startsWith('Jan') || m.month.startsWith('Feb') || m.month.startsWith('Mar')) })
              const q2 = months.filter(function(m) { return m.month && (m.month.startsWith('Apr') || m.month.startsWith('May') || m.month.startsWith('Jun')) })
              const q3 = months.filter(function(m) { return m.month && (m.month.startsWith('Jul') || m.month.startsWith('Aug') || m.month.startsWith('Sep')) })
              const q4 = months.filter(function(m) { return m.month && (m.month.startsWith('Oct') || m.month.startsWith('Nov') || m.month.startsWith('Dec')) })
              const sumIncome = function(arr) { return arr.reduce(function(s, m) { return s + (m.income || 0) }, 0) }
              const sumNet = function(arr) { return arr.reduce(function(s, m) { return s + (m.net || 0) }, 0) }
              multiYearData += `  Quarterly Revenue: Q1 $${sumIncome(q1).toLocaleString()}, Q2 $${sumIncome(q2).toLocaleString()}, Q3 $${sumIncome(q3).toLocaleString()}, Q4 $${sumIncome(q4).toLocaleString()}\n`
              multiYearData += `  Quarterly Net Income: Q1 $${sumNet(q1).toLocaleString()}, Q2 $${sumNet(q2).toLocaleString()}, Q3 $${sumNet(q3).toLocaleString()}, Q4 $${sumNet(q4).toLocaleString()}\n`
            }
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

Format your responses for readability:
- Use bullet points (- ) for lists of data points, metrics, or comparisons
- Use **bold** for key numbers, company names, and important terms
- Use line breaks between sections
- For multi-year or multi-company data, always use bullet points, never inline
- Keep analysis concise — 2-4 sentences of insight after the data
- You also have web search capability — use it to find current industry news, market data, regulations, or any information not in the dashboard

ACTION CAPABILITIES:
You can take actions on behalf of the user. When the user asks you to create, schedule, or send something, respond with a brief confirmation message AND include an action block. The action block must be on its own line in this exact format:

[ACTION:calendar_create:{"title":"Meeting title","date":"YYYY-MM-DD","time":"HH:MM","company":"optional company","notes":"optional notes"}]
[ACTION:task_create:{"name":"Task name","companyKey":"nectera|xtract|bcs|lush","lead":"optional person","status":"Not Started","priority":"Medium|High|Low","dueDate":"YYYY-MM-DD","notes":"optional notes"}]
[ACTION:note_create:{"company":"Nectera Holdings|Xtract Environmental Services|Bug Control Specialist|Lush Green Landscapes","title":"Note title","content":"Note body text"}]
[ACTION:message_send:{"recipientName":"Person name","text":"Message content"}]

IMPORTANT RULES FOR ACTIONS:
- Always include a friendly confirmation message BEFORE the action block, describing what you will do
- Only include ONE action block per response
- For dates, if the user says "tomorrow" or "next Tuesday", calculate the actual date (today is ${new Date().toISOString().split('T')[0]})
- For tasks, default companyKey to "nectera" unless the user specifies a company
- For notes, default company to "Nectera Holdings" unless specified
- For calendar events, use 24-hour time format (e.g. "14:00" for 2pm)
- For messages, match the recipient name to someone in the team directory
- The user will be shown a confirmation card and must approve before the action executes
- If you cannot determine required fields (like title/name), ask the user for clarification instead of guessing
- Always sign off with a line break then —Nora${memoryContext}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: messages,
    })
    const textContent = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
    let reply = textContent || "I searched for that but couldn't find a clear answer."
    let action = null
    const actionMatch = reply.match(/\[ACTION:(\w+):(\{.*\})\]/)
    if (actionMatch) {
      try {
        action = { type: actionMatch[1], data: JSON.parse(actionMatch[2]) }
        reply = reply.replace(actionMatch[0], '').trim()
      } catch(e) {}
    }
    return new Response(JSON.stringify({ reply, action }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch(err) {
    console.error('AI error:', err.message)
    return new Response(JSON.stringify({ reply: 'Error: ' + err.message }), {
      headers: { 'Content-Type': 'application/json' }, status: 500
    })
  }
}
