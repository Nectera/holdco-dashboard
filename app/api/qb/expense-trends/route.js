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
      const updated = { ...t, accessToken: newTokens.access_token, refreshToken: newTokens.refresh_token || t.refreshToken, expiresAt: Date.now() + (newTokens.expires_in * 1000) }
      await redis.set(`tokens:${company}`, updated)
      return updated
    } catch (err) { return t }
  }
  return t
}

const companyNames = { xtract: 'Xtract Environmental Services', bcs: 'Bug Control Specialist', lush: 'Lush Green Landscapes' }

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')
  const year = searchParams.get('year') || new Date().getFullYear()
  const valid = ['xtract', 'bcs', 'lush']
  if (!valid.includes(company)) return new Response(JSON.stringify({ error: 'Invalid company' }), { status: 400 })

  try {
    const token = await getValidToken(company)
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 })

    const url = `https://quickbooks.api.intuit.com/v3/company/${token.realmId}/reports/ProfitAndLoss?start_date=${year}-01-01&end_date=${year}-12-31&summarize_column_by=Month&minorversion=65`
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token.accessToken}`, 'Accept': 'application/json' } })
    const report = await res.json()

    const columns = report.Columns ? report.Columns.Column || [] : []
    const moneyCols = columns.filter(function(c) { return c.ColType === 'Money' })
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthLabels = moneyCols.map(function(c) {
      const meta = c.MetaData || []
      const sd = meta.find(function(m) { return m.Name === 'StartDate' })
      if (!sd) return ''
      const parts = sd.Value.split('-')
      return monthNames[parseInt(parts[1]) - 1] + ' ' + parts[0].slice(2)
    })

    const categories = {}
    var collecting = false

    var processRows = function(rows) {
      if (!rows) return
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i]
        if (row.type === 'Section') {
          var label = row.Header && row.Header.ColData && row.Header.ColData[0] ? row.Header.ColData[0].value : ''
          if (label === 'Expenses' || label === 'Cost of Goods Sold') collecting = true
          if (row.Rows && row.Rows.Row) processRows(row.Rows.Row)
          if (label === 'Expenses' || label === 'Cost of Goods Sold') collecting = false
        } else if (row.type === 'Data' && collecting) {
          var cols = row.ColData || []
          var catName = cols[0] ? cols[0].value : ''
          if (!catName) continue
          var simpleName = catName.replace(/^\d+\s*/, '').replace(/^\d+\.\d+\s*/, '')
          var values = cols.slice(1).map(function(c) { return parseFloat(c.value || 0) })
          var total = values.reduce(function(s, v) { return s + v }, 0)
          if (total > 0) categories[simpleName] = values
        }
      }
    }

    processRows(report.Rows ? report.Rows.Row : [])

    var sorted = Object.entries(categories).sort(function(a, b) {
      return b[1].reduce(function(s, v) { return s + v }, 0) - a[1].reduce(function(s, v) { return s + v }, 0)
    })

    var topCategories = sorted.slice(0, 8)
    var otherValues = monthLabels.map(function(_, mi) {
      return sorted.slice(8).reduce(function(s, entry) { return s + (entry[1][mi] || 0) }, 0)
    })

    var monthly = monthLabels.map(function(label, mi) {
      var obj = { month: label }
      topCategories.forEach(function(entry) { obj[entry[0]] = entry[1][mi] || 0 })
      if (otherValues[mi] > 0) obj['Other'] = otherValues[mi]
      return obj
    }).filter(function(m) {
      return Object.keys(m).some(function(k) { return k !== 'month' && m[k] > 0 })
    })

    var categoryNames = topCategories.map(function(e) { return e[0] })
    if (otherValues.some(function(v) { return v > 0 })) categoryNames.push('Other')

    return new Response(JSON.stringify({ company: companyNames[company], monthly: monthly, categories: categoryNames }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
