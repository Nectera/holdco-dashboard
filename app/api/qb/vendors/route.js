import { getValidToken } from '../../../lib/qb-token'

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

    const data = await queryQB(token, 'SELECT * FROM Vendor WHERE Active = true MAXRESULTS 500')
    const raw = data && data.QueryResponse && data.QueryResponse.Vendor ? data.QueryResponse.Vendor : []
    const vendors = raw.map(function(v) {
      return {
        id: v.Id,
        name: v.DisplayName || v.CompanyName || 'Unknown',
        company: v.CompanyName || '',
        email: v.PrimaryEmailAddr ? v.PrimaryEmailAddr.Address : '',
        phone: v.PrimaryPhone ? v.PrimaryPhone.FreeFormNumber : '',
        balance: parseFloat(v.Balance || 0),
        city: v.BillAddr ? v.BillAddr.City || '' : '',
        state: v.BillAddr ? v.BillAddr.CountrySubDivisionCode || '' : '',
      }
    }).sort(function(a, b) { return b.balance - a.balance })

    const totalBalance = vendors.reduce(function(sum, v) { return sum + v.balance }, 0)
    const withBalance = vendors.filter(function(v) { return v.balance > 0 }).length

    return new Response(JSON.stringify({
      company: companyNames[company],
      vendors: vendors,
      totalBalance: totalBalance,
      totalVendors: vendors.length,
      vendorsWithBalance: withBalance,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
