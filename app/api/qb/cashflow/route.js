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
  const rows = report && report.Rows && report.Rows.Row ? report.Rows.Row : []
  const processRows = (rows, depth) => {
    if (!depth) depth = 0
    for (const row of rows) {
      if (row.type === 'Section') {
        const label = row.Header && row.Header.ColData && row.Header.ColData[0] ? row.Header.ColData[0].value : ''
        const children = row.Rows && row.Rows.Row ? row.Rows.Row : []
        if (label) results.push({ label: label, value: null, isTotal: false, isHeader: true, depth: depth })
        if (children.length > 0) processRows(children, depth + 1)
        if (row.Summary) {
          const val = parseFloat(row.Summary.ColData && row.Summary.ColData[1] ? row.Summary.ColData[1].value : 0)
          results.push({ label: 'Total ' + label, value: val, isTotal: true, depth: depth })
        }
      } else if (row.type === 'Data') {
        const label = row.ColData && row.ColData[0] ? row.ColData[0].value : ''
        const val = parseFloat(row.ColData && row.ColData[1] ? row.ColData[1].value : 0)
        if (label) results.push({ label: label, value: val, isTotal: false, isHeader: false, depth: depth })
      }
    }
  }
  processRows(rows)
  return results
}

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams
  const company = searchParams.get('company')
  const year = searchParams.get('year') || new Date().getFullYear()

  const valid = ['xtract', 'bcs', 'lush']
  if (valid.indexOf(company) === -1) {
    return new Response(JSON.stringify({ error: 'Invalid company' }), { status: 400 })
  }

  try {
    const token = await getValidToken(company)
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 })

    const params = 'start_date=' + year + '-01-01&end_date=' + year + '-12-31'
    const report = await fetchReport(token, 'CashFlow', params)
    const rows = extractRows(report)

    return new Response(JSON.stringify({
      company: companyNames[company],
      title: 'Cash Flow Statement',
      rows: rows,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
