import { Redis } from '@upstash/redis'
import OAuthClient from 'intuit-oauth'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

const oauthClient = new OAuthClient({
  clientId: process.env.INTUIT_CLIENT_ID,
  clientSecret: process.env.INTUIT_CLIENT_SECRET,
  environment: 'production',
  redirectUri: 'https://nexus-orcin-psi.vercel.app/api/qb/callback',
})

const getValidToken = async (company) => {
  const t = await redis.get(`tokens:${company}`)
  if (!t) return null
  if (!t.expiresAt || Date.now() > t.expiresAt - 300000) {
    try {
      const response = await oauthClient.refreshUsingToken(t.refreshToken)
      const newTokens = response.getJson()
      const updated = {
        ...t,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || t.refreshToken,
        expiresAt: Date.now() + (newTokens.expires_in * 1000),
      }
      await redis.set(`tokens:${company}`, updated)
      return updated
    } catch (err) {
      return t
    }
  }
  return t
}

const companyNames = {
  xtract: 'Xtract Environmental Services',
  bcs: 'Bug Control Specialist',
  lush: 'Lush Green Landscapes',
}

const fetchReport = async (token, reportType, params) => {
  const url = `https://quickbooks.api.intuit.com/v3/company/${token.realmId}/reports/${reportType}?${params}&minorversion=65`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token.accessToken}`, 'Accept': 'application/json' },
  })
  return res.json()
}

const extractRows = (report) => {
  const results = []
  const rows = report?.Rows?.Row || []
  const processRows = (rows, depth = 0) => {
    for (const row of rows) {
      if (row.type === 'Section') {
        const label = row.Header?.ColData?.[0]?.value || ''
        const children = row.Rows?.Row || []
        if (children.length > 0) processRows(children, depth + 1)
        if (row.Summary) {
          const value = parseFloat(row.Summary?.ColData?.[1]?.value || 0)
          if (value !== 0) results.push({ label: 'Total ' + label, value, isTotal: true, depth })
        }
      } else if (row.type === 'Data') {
        const label = row.ColData?.[0]?.value || ''
        const value = parseFloat(row.ColData?.[1]?.value || 0)
        if (label && value !== 0) results.push({ label, value, isTotal: false, depth })
      }
    }
  }
  processRows(rows)
  return results
}

const extractMonthly = (report) => {
  const columns = report?.Columns?.Column || []
  const monthCols = columns.filter(c => c.ColType === 'Money')
  const months = monthCols.map((c, i) => {
    const meta = c.MetaData || []
    const startDate = meta.find(m => m.Name === 'StartDate')?.Value
    return startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'M' + (i+1)
  })
  const monthly = months.map(month => ({ month, income: 0, expenses: 0, net: 0 }))
  const rows = report?.Rows?.Row || []
  const processRows = (rows) => {
    for (const row of rows) {
      if (row.type === 'Section' && row.Rows) processRows(row.Rows.Row || [])
      if (row.Summary) {
        const label = row.Summary?.ColData?.[0]?.value || row.Header?.ColData?.[0]?.value || ''
        const cols = row.Summary.ColData.slice(1)
        cols.forEach((col, i) => {
          if (!monthly[i]) return
          const val = parseFloat(col.value || 0)
          if (label.includes('Income') && !label.includes('Net')) monthly[i].income = val
          if (label.includes('Expenses')) monthly[i].expenses = val
          if (label.includes('Net Income')) monthly[i].net = val
        })
      }
    }
  }
  processRows(rows)
  return monthly.filter(m => m.income !== 0 || m.expenses !== 0 || m.net !== 0)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')
  if (!company || !companyNames[company]) {
    return new Response(JSON.stringify({ error: 'Invalid company' }), { status: 400 })
  }
  try {
    const token = await getValidToken(company)
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 })
    const year = new Date().getFullYear()
    const params = 'start_date=' + year + '-01-01&end_date=' + year + '-12-31'
    const [ytdReport, monthlyReport] = await Promise.all([
      fetchReport(token, 'ProfitAndLoss', params),
      fetchReport(token, 'ProfitAndLoss', params + '&summarize_column_by=Month'),
    ])
    const rows = extractRows(ytdReport)
    const monthly = extractMonthly(monthlyReport)
    return new Response(JSON.stringify({
      company: companyNames[company],
      rows,
      monthly,
    }), { headers: { 'content-type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
