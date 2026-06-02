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

  // If a specific company is requested
  if (company) {
    const valid = ['xtract', 'bcs', 'lush']
    if (!valid.includes(company)) {
      return new Response(JSON.stringify({ error: 'Invalid company' }), { status: 400 })
    }

    try {
      const token = await getValidToken(company)
      if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 })

      // Query all Bank and Credit Card accounts
      const bankData = await queryQB(token, "SELECT * FROM Account WHERE AccountType = 'Bank' AND Active = true MAXRESULTS 100")
      const ccData = await queryQB(token, "SELECT * FROM Account WHERE AccountType = 'Credit Card' AND Active = true MAXRESULTS 100")

      const bankAccounts = (bankData?.QueryResponse?.Account || []).map(a => ({
        id: a.Id,
        name: a.Name || a.FullyQualifiedName || 'Unknown',
        type: 'Bank',
        subType: a.AccountSubType || '',
        balance: parseFloat(a.CurrentBalance || 0),
        currency: a.CurrencyRef?.value || 'USD',
      }))

      const ccAccounts = (ccData?.QueryResponse?.Account || []).map(a => ({
        id: a.Id,
        name: a.Name || a.FullyQualifiedName || 'Unknown',
        type: 'Credit Card',
        subType: a.AccountSubType || '',
        balance: parseFloat(a.CurrentBalance || 0),
        currency: a.CurrencyRef?.value || 'USD',
      }))

      const accounts = [...bankAccounts, ...ccAccounts].sort((a, b) => b.balance - a.balance)
      const totalBank = bankAccounts.reduce((s, a) => s + a.balance, 0)
      const totalCC = ccAccounts.reduce((s, a) => s + a.balance, 0)

      return new Response(JSON.stringify({
        company: companyNames[company],
        companyKey: company,
        accounts,
        totalBank,
        totalCreditCard: totalCC,
        netCash: totalBank + totalCC,
      }), { headers: { 'Content-Type': 'application/json' } })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
  }

  // If no company specified, fetch all
  const results = await Promise.all(
    Object.keys(companyNames).map(async (key) => {
      try {
        const token = await getValidToken(key)
        if (!token) return { company: companyNames[key], companyKey: key, accounts: [], totalBank: 0, totalCreditCard: 0, netCash: 0, error: 'No token' }

        const bankData = await queryQB(token, "SELECT * FROM Account WHERE AccountType = 'Bank' AND Active = true MAXRESULTS 100")
        const ccData = await queryQB(token, "SELECT * FROM Account WHERE AccountType = 'Credit Card' AND Active = true MAXRESULTS 100")

        const bankAccounts = (bankData?.QueryResponse?.Account || []).map(a => ({
          id: a.Id,
          name: a.Name || a.FullyQualifiedName || 'Unknown',
          type: 'Bank',
          subType: a.AccountSubType || '',
          balance: parseFloat(a.CurrentBalance || 0),
          currency: a.CurrencyRef?.value || 'USD',
        }))

        const ccAccounts = (ccData?.QueryResponse?.Account || []).map(a => ({
          id: a.Id,
          name: a.Name || a.FullyQualifiedName || 'Unknown',
          type: 'Credit Card',
          subType: a.AccountSubType || '',
          balance: parseFloat(a.CurrentBalance || 0),
          currency: a.CurrencyRef?.value || 'USD',
        }))

        const accounts = [...bankAccounts, ...ccAccounts].sort((a, b) => b.balance - a.balance)
        const totalBank = bankAccounts.reduce((s, a) => s + a.balance, 0)
        const totalCC = ccAccounts.reduce((s, a) => s + a.balance, 0)

        return {
          company: companyNames[key],
          companyKey: key,
          accounts,
          totalBank,
          totalCreditCard: totalCC,
          netCash: totalBank + totalCC,
        }
      } catch (err) {
        return { company: companyNames[key], companyKey: key, accounts: [], totalBank: 0, totalCreditCard: 0, netCash: 0, error: err.message }
      }
    })
  )

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } })
}
