import QuickBooks from 'node-quickbooks'
import { getValidToken } from '../../../lib/qb-token'

const getQBO = (accessToken, realmId) => new QuickBooks(
  process.env.INTUIT_CLIENT_ID,
  process.env.INTUIT_CLIENT_SECRET,
  accessToken,
  false,
  realmId,
  false,
  false,
  null,
  '2.0',
  false
)

const fetchPL = (qbo, year) => new Promise((resolve) => {
  qbo.reportProfitAndLoss({ start_date: `${year}-01-01`, end_date: `${year}-12-31` }, (err, report) => {
    if (err) resolve(null)
    else resolve(report)
  })
})

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') || new Date().getFullYear().toString()
  const subs = [
    { name: "Xtract Environmental Services", key: "xtract" },
    { name: "Bug Control Specialist", key: "bcs" },
    { name: "Lush Green Landscapes", key: "lush" },
  ]

  const results = await Promise.all(
    subs.map(async (sub) => {
      const token = await getValidToken(sub.key)
      if (!token) return { name: sub.name, report: null }
      const qbo = getQBO(token.accessToken, token.realmId)
      const report = await fetchPL(qbo, year)
      return { name: sub.name, report }
    })
  )

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'content-type': 'application/json' },
  })
}
