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

const queryQB = async (token, query) => {
  const url = `https://quickbooks.api.intuit.com/v3/company/${token.realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token.accessToken}`, 'Accept': 'application/json' },
  })
  return res.json()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')

  const valid = ['xtract', 'bcs', 'lush']
  if (!valid.includes(company)) {
    return new Response(JSON.stringify({ error: 'Invalid company' }), { status: 400 })
  }

  try {
    const token = await getValidToken(company)
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 })

    const data = await queryQB(token, 'SELECT * FROM Customer WHERE Active = true MAXRESULTS 500')
    const raw = data && data.QueryResponse && data.QueryResponse.Customer ? data.QueryResponse.Customer : []
    const customers = raw.map(function(c) {
      return {
        id: c.Id,
        name: c.DisplayName || c.CompanyName || 'Unknown',
        company: c.CompanyName || '',
        email: c.PrimaryEmailAddr ? c.PrimaryEmailAddr.Address : '',
        phone: c.PrimaryPhone ? c.PrimaryPhone.FreeFormNumber : '',
        balance: parseFloat(c.Balance || 0),
        city: c.BillAddr ? c.BillAddr.City || '' : '',
        state: c.BillAddr ? c.BillAddr.CountrySubDivisionCode || '' : '',
      }
    }).sort(function(a, b) { return b.balance - a.balance })

    const totalBalance = customers.reduce(function(sum, c) { return sum + c.balance }, 0)
    const withBalance = customers.filter(function(c) { return c.balance > 0 }).length

    return new Response(JSON.stringify({
      company: companyNames[company],
      customers: customers,
      totalBalance: totalBalance,
      totalCustomers: customers.length,
      customersWithBalance: withBalance,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
