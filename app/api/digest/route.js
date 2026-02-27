import { Redis } from '@upstash/redis'
import nodemailer from 'nodemailer'
import Anthropic from '@anthropic-ai/sdk'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
})

const fetchData = async (endpoint) => {
  const base = process.env.NEXTAUTH_URL || 'https://nexus-orcin-psi.vercel.app'
  try {
    // Only run on the second Monday of the month
    const today = new Date()
    const dayOfMonth = today.getUTCDate()
    if (dayOfMonth < 8 || dayOfMonth > 14) {
      return new Response(JSON.stringify({ skipped: true, message: 'Not the second Monday' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const res = await fetch(base + '/api/qb/' + endpoint)
    return await res.json()
  } catch (e) { return null }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const year = new Date().getFullYear()
    const priorYear = year - 1
    const companies = ['xtract', 'bcs', 'lush']
    const names = { xtract: 'Xtract Environmental Services', bcs: 'Bug Control Specialist', lush: 'Lush Green Landscapes' }

    const results = await Promise.all(companies.map(async (key) => {
      const [details, priorDetails, cashflow, ar, ap] = await Promise.all([
        fetchData('details?company=' + key + '&year=' + year),
        fetchData('details?company=' + key + '&year=' + priorYear),
        fetchData('cashflow?company=' + key + '&year=' + year),
        fetchData('report?company=' + key + '&type=ar&year=' + year),
        fetchData('report?company=' + key + '&type=ap&year=' + year),
      ])
      return { key, name: names[key], details, priorDetails, cashflow, ar, ap }
    }))

    // Build context for Nora
    let context = 'WEEKLY FINANCIAL DIGEST DATA:\n\n'
    const findVal = (rows, match) => {
      if (!rows) return 0
      for (const r of rows) {
        if (r.label && r.label.toLowerCase().includes(match.toLowerCase()) && r.value !== null) return r.value
      }
      return 0
    }

    for (const r of results) {
      const rows = r.details && r.details.rows ? r.details.rows : []
      const priorRows = r.priorDetails && r.priorDetails.rows ? r.priorDetails.rows : []
      const rev = findVal(rows, 'Total Income')
      const cogs = findVal(rows, 'Total Cost of Goods Sold')
      const gp = rev - cogs
      const opex = findVal(rows, 'Total Expenses')
      const net = findVal(rows, 'Net Income') || (gp - opex)
      const dep = findVal(rows, 'Depreciation')
      const interest = findVal(rows, 'Interest Expense')
      const ebitda = net + interest + dep
      const priorRev = findVal(priorRows, 'Total Income')
      const priorNet = findVal(priorRows, 'Net Income')
      const gpMargin = rev > 0 ? ((gp / rev) * 100).toFixed(1) : '0.0'
      const netMargin = rev > 0 ? ((net / rev) * 100).toFixed(1) : '0.0'

      context += '--- ' + r.name + ' ---\n'
      context += 'Revenue: $' + rev.toLocaleString() + (priorRev > 0 ? ' (Prior year: $' + priorRev.toLocaleString() + ', change: ' + (((rev - priorRev) / priorRev) * 100).toFixed(1) + '%)' : '') + '\n'
      context += 'Net Income: $' + net.toLocaleString() + ' (' + netMargin + '% margin)\n'
      context += 'EBITDA: $' + ebitda.toLocaleString() + '\n'
      context += 'Gross Margin: ' + gpMargin + '%\n'

      if (r.details && r.details.monthly) {
        const months = r.details.monthly
        const recent = months.filter(m => m.income > 0).slice(-2)
        if (recent.length === 2) {
          context += 'Recent months: ' + recent[0].month + ' revenue $' + recent[0].income.toLocaleString() + ', ' + recent[1].month + ' revenue $' + recent[1].income.toLocaleString() + '\n'
        }
      }

      if (r.cashflow && r.cashflow.rows) {
        const cfRows = r.cashflow.rows.filter(x => x.isTotal)
        for (const cf of cfRows) {
          if (cf.value !== null) context += cf.label + ': $' + cf.value.toLocaleString() + '\n'
        }
      }

      if (r.ar && r.ar.rows) {
        const arTotal = r.ar.rows.find(x => x.isTotal)
        if (arTotal && arTotal.value > 0) {
          context += 'Total AR: $' + arTotal.value.toLocaleString()
          if (arTotal.over91 > 0) context += ' (91+ days: $' + arTotal.over91.toLocaleString() + ')'
          context += '\n'
        }
      }

      if (r.ap && r.ap.rows) {
        const apTotal = r.ap.rows.find(x => x.isTotal)
        if (apTotal && apTotal.value > 0) context += 'Total AP: $' + apTotal.value.toLocaleString() + '\n'
      }
      context += '\n'
    }

    // Ask Nora to write the digest
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: 'You are Nora, the AI assistant for Nectera Holdings. Write a concise, professional weekly financial digest email. Use the data provided to highlight key metrics, notable trends, concerns (like overdue AR), and wins. Format with clean sections using simple HTML tags (h3, p, strong, ul/li). Keep it scannable — busy executives should get the picture in 60 seconds. Do NOT use markdown. Sign off as Nora.',
      messages: [{ role: 'user', content: 'Write the weekly financial digest for Nectera Holdings based on this data. Today is ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '.\n\n' + context }],
    })

    const digestContent = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    // Send email
    const emailHtml = `
    <html>
    <body style="margin:0;padding:0;background:#0f0e0d;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0e0d;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#f4f0e8;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
            <tr><td style="background:#0f0e0d;padding:24px 36px;text-align:center;">
              <span style="background:#c9a84c;border-radius:8px;padding:6px 12px;color:#0f0e0d;font-size:18px;font-weight:700;">N</span>
              <span style="color:#f4f0e8;font-size:18px;margin-left:10px;">Nectera Holdings</span>
            </td></tr>
            <tr><td style="padding:36px;">
              <p style="margin:0 0 6px;font-size:11px;color:#a09880;text-transform:uppercase;letter-spacing:0.08em;">Weekly Financial Digest</p>
              ${digestContent}
              <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e8e2d9;">
                <a href="https://necteraholdings.com" style="display:inline-block;background:#0f0e0d;color:#f4f0e8;text-align:center;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">View Dashboard</a>
              </div>
            </td></tr>
            <tr><td style="padding:20px 36px;border-top:1px solid #e8e2d9;text-align:center;">
              <p style="margin:0;font-size:11px;color:#c0b8ac;">Nectera Holdings &middot; necteraholdings.com</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    `

    await transporter.sendMail({
      from: '"Nora · Nectera Holdings" <' + process.env.GMAIL_USER + '>',
      to: 'cody@necteraholdings.com',
      subject: 'Weekly Financial Digest — ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      html: emailHtml,
    })

    return new Response(JSON.stringify({ success: true, message: 'Digest sent' }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
