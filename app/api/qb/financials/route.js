import QuickBooks from 'node-quickbooks'

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

const fetchPL = (qbo) => new Promise((resolve) => {
  qbo.reportProfitAndLoss({}, (err, report) => {
    if (err) resolve(null)
    else resolve(report)
  })
})

export async function GET() {
  const subs = [
    {
      name: "Xtract Environmental Services",
      accessToken: process.env.XTRACT_ACCESS_TOKEN,
      realmId: process.env.XTRACT_REALM_ID,
    },
    {
      name: "Bug Control Specialist",
      accessToken: process.env.BCS_ACCESS_TOKEN,
      realmId: process.env.BCS_REALM_ID,
    },
    {
      name: "Lush Green Landscapes",
      accessToken: process.env.LUSH_ACCESS_TOKEN,
      realmId: process.env.LUSH_REALM_ID,
    },
  ]

  const results = await Promise.all(
    subs.map(async (sub) => {
      const qbo = getQBO(sub.accessToken, sub.realmId)
      const report = await fetchPL(qbo)
      return { name: sub.name, report }
    })
  )

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'content-type': 'application/json' },
  })
}
