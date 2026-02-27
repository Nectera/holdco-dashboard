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

const extractRows = (report, reportType) => {
  const results = []
  const rows = report && report.Rows && report.Rows.Row ? report.Rows.Row : []

  if (reportType === 'AgedReceivables' || reportType === 'AgedPayables') {
    // Add column headers
    results.push({ label: 'Name', value: null, isHeader: true, isAging: true, depth: 0, colHeaders: true, current: 'Current', over30: '1-30', over60: '31-60', over90: '61-90', over91: '91+' })
    for (const row of rows) {
      const cols = row.ColData || []
      const name = cols[0] ? cols[0].value : ''
      if (!name) continue
      const current = parseFloat((cols[1] && cols[1].value) || 0)
      const over30 = parseFloat((cols[2] && cols[2].value) || 0)
      const over60 = parseFloat((cols[3] && cols[3].value) || 0)
      const over90 = parseFloat((cols[4] && cols[4].value) || 0)
      const over91 = parseFloat((cols[5] && cols[5].value) || 0)
      const total = parseFloat((cols[cols.length - 1] && cols[cols.length - 1].value) || 0)
      if (total !== 0) results.push({ label: name, value: total, current, over30, over60, over90, over91, isTotal: false, isHeader: false, isAging: true, depth: 0 })
    }
    // Add total row
    const totals = results.slice(1).reduce((acc, r) => ({
      current: acc.current + (r.current || 0),
      over30: acc.over30 + (r.over30 || 0),
      over60: acc.over60 + (r.over60 || 0),
      over90: acc.over90 + (r.over90 || 0),
      over91: acc.over91 + (r.over91 || 0),
      value: acc.value + (r.value || 0),
    }), { current: 0, over30: 0, over60: 0, over90: 0, over91: 0, value: 0 })
    results.push({ label: 'TOTAL', ...totals, isTotal: true, isHeader: false, isAging: true, depth: 0 })
    return results
  }

  const processRows = (rows, depth) => {
    if (!depth) depth = 0
    for (const row of rows) {
      if (row.type === 'Section') {
        const label = row.Header && row.Header.ColData && row.Header.ColData[0] ? row.Header.ColData[0].value : ''
        const children = row.Rows && row.Rows.Row ? row.Rows.Row : []
        if (label) results.push({ label, value: null, isTotal: false, isHeader: true, depth })
        if (children.length > 0) processRows(children, depth + 1)
        if (row.Summary) {
          const cols = row.Summary.ColData || []
          const value = parseFloat((cols[1] && cols[1].value) || (cols[cols.length - 1] && cols[cols.length - 1].value) || 0)
          results.push({ label: 'Total ' + label, value, isTotal: true, depth })
        }
      } else if (row.type === 'Data') {
        const cols = row.ColData || []
        const label = cols[0] ? cols[0].value : ''
        const value = parseFloat((cols[1] && cols[1].value) || (cols[cols.length - 1] && cols[cols.length - 1].value) || 0)
        if (label) results.push({ label, value, isTotal: false, isHeader: false, depth })
      }
    }
  }
  processRows(rows)
  return results
}


const extractMonthly = (report, year) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yr = parseInt(year)
  const shortYear = String(yr).slice(2)

  // Build full 12-month skeleton with correct labels
  const allMonths = monthNames.map(m => ({ month: m + ' ' + shortYear, income: 0, expenses: 0, net: 0 }))

  const columns = report?.Columns?.Column || []
  const monthCols = columns.filter(c => c.ColType === 'Money')

  // Map each column to month slot 0-11 based on actual QB start date
  const colToMonthIdx = monthCols.map((c) => {
    const meta = c.MetaData || []
    const startDate = meta.find(m => m.Name === 'StartDate')?.Value
    if (!startDate) return -1
    const parts = startDate.split('-')
    const colYear = parseInt(parts[0])
    const colMonth = parseInt(parts[1]) - 1 // 0-indexed
    if (colYear !== yr) return -1
    return colMonth
  })

  const rows = report?.Rows?.Row || []
  const processRows = (rows) => {
    for (const row of rows) {
      if (row.type === 'Section' && row.Rows) processRows(row.Rows.Row || [])
      if (row.Summary) {
        const label = row.Summary?.ColData?.[0]?.value || row.Header?.ColData?.[0]?.value || ''
        const cols = row.Summary.ColData.slice(1)
        cols.forEach((col, i) => {
          const monthIdx = colToMonthIdx[i]
          if (monthIdx === -1 || monthIdx === undefined) return
          const val = parseFloat(col.value || 0)
          if (label === 'Total Income') allMonths[monthIdx].income = val
          if (label === 'Total Expenses') allMonths[monthIdx].expenses += val
          if (label === 'Total Cost of Goods Sold') allMonths[monthIdx].expenses += val
          if (label === 'Net Income') allMonths[monthIdx].net = val
        })
      }
    }
  }
  processRows(rows)
  return allMonths
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')
  const type = searchParams.get('type')
  const year = searchParams.get('year') || new Date().getFullYear()

  const valid = ['xtract', 'bcs', 'lush']
  if (!valid.includes(company)) {
    return new Response(JSON.stringify({ error: 'Invalid company' }), { status: 400 })
  }

  try {
    const token = await getValidToken(company)
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 })

    let reportType, params, title
    if (type === 'pl') {
      reportType = 'ProfitAndLoss'
      params = 'start_date=' + year + '-01-01&end_date=' + year + '-12-31'
      title = 'Profit & Loss'
    } else if (type === 'balance') {
      reportType = 'BalanceSheet'
      params = 'start_date=' + year + '-01-01&end_date=' + year + '-12-31'
      title = 'Balance Sheet'
    } else if (type === 'ar') {
      reportType = 'AgedReceivables'
      params = ''
      title = 'A/R Aging'
    } else if (type === 'ap') {
      reportType = 'AgedPayables'
      params = ''
      title = 'A/P Aging'
    } else if (type === 'cashflow') {
      reportType = 'CashFlow'
      params = 'start_date=' + year + '-01-01&end_date=' + year + '-12-31'
      title = 'Cash Flow Statement'
    } else {
      return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 })
    }

    const report = await fetchReport(token, reportType, params)
    const rows = extractRows(report, reportType)
    const names = { xtract: 'Xtract Environmental Services', bcs: 'Bug Control Specialist', lush: 'Lush Green Landscapes' }
    return new Response(JSON.stringify({ title, company: names[company], rows }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
