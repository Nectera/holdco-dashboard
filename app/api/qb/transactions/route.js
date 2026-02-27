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
  const type = searchParams.get('type') || 'all'
  const limit = parseInt(searchParams.get('limit') || '50')

  const valid = ['xtract', 'bcs', 'lush']
  if (!valid.includes(company)) {
    return new Response(JSON.stringify({ error: 'Invalid company' }), { status: 400 })
  }

  try {
    const token = await getValidToken(company)
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 })

    const transactions = []

    if (type === 'all' || type === 'invoices') {
      const invoiceData = await queryQB(token, `SELECT * FROM Invoice ORDER BY TxnDate DESC MAXRESULTS ${limit}`)
      const invoices = invoiceData && invoiceData.QueryResponse && invoiceData.QueryResponse.Invoice ? invoiceData.QueryResponse.Invoice : []
      for (const inv of invoices) {
        transactions.push({
          type: 'Invoice',
          id: inv.Id,
          date: inv.TxnDate,
          dueDate: inv.DueDate,
          customer: inv.CustomerRef ? inv.CustomerRef.name : 'Unknown',
          amount: parseFloat(inv.TotalAmt || 0),
          balance: parseFloat(inv.Balance || 0),
          status: parseFloat(inv.Balance || 0) === 0 ? 'Paid' : (new Date(inv.DueDate) < new Date() ? 'Overdue' : 'Open'),
          docNumber: inv.DocNumber,
        })
      }
    }

    if (type === 'all' || type === 'bills') {
      const billData = await queryQB(token, `SELECT * FROM Bill ORDER BY TxnDate DESC MAXRESULTS ${limit}`)
      const bills = billData && billData.QueryResponse && billData.QueryResponse.Bill ? billData.QueryResponse.Bill : []
      for (const bill of bills) {
        transactions.push({
          type: 'Bill',
          id: bill.Id,
          date: bill.TxnDate,
          dueDate: bill.DueDate,
          vendor: bill.VendorRef ? bill.VendorRef.name : 'Unknown',
          amount: parseFloat(bill.TotalAmt || 0),
          balance: parseFloat(bill.Balance || 0),
          status: parseFloat(bill.Balance || 0) === 0 ? 'Paid' : (new Date(bill.DueDate) < new Date() ? 'Overdue' : 'Open'),
        })
      }
    }

    if (type === 'all' || type === 'payments') {
      const paymentData = await queryQB(token, `SELECT * FROM Payment ORDER BY TxnDate DESC MAXRESULTS ${limit}`)
      const payments = paymentData && paymentData.QueryResponse && paymentData.QueryResponse.Payment ? paymentData.QueryResponse.Payment : []
      for (const pmt of payments) {
        transactions.push({
          type: 'Payment',
          id: pmt.Id,
          date: pmt.TxnDate,
          customer: pmt.CustomerRef ? pmt.CustomerRef.name : 'Unknown',
          amount: parseFloat(pmt.TotalAmt || 0),
          balance: 0,
          status: 'Received',
        })
      }
    }

    transactions.sort(function(a, b) { return new Date(b.date) - new Date(a.date) })

    return new Response(JSON.stringify({
      company: companyNames[company],
      transactions: transactions.slice(0, limit),
      count: transactions.length,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
