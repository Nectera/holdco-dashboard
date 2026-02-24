export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company') || 'all'
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY

 const sheets = {
  nectera: '1hqMBV4fSNAwuOTTfEFG_ZQvSXAvJx8Wpa9zEj2M9hDg',
  xtract: '1JbFv__n5ClYG-qwCZztRnL3nWs2vjdo-A8pZF67iS9M',
  bcs: '1uLNoDqUrnIH8Tz9A8ZOMhMbtXLbysXtIxm2jawyPkss',
  lush: '1_1YNJItBZLwT8DXaJQ3eikHi0zYh7zPDbBXQ9DpQXMg',
  }

  const companyNames = {
    nectera: 'Nectera Holdings',
    xtract: 'Xtract Environmental Services',
    bcs: 'Bug Control Specialist',
    lush: 'Lush Green Landscapes',
  }

  const fetchTasks = async (key) => {
    const sheetId = sheets[key]
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:H100?key=${apiKey}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (!data.values) return []
      const [, ...rows] = data.values
      return rows
        .map((row, i) => ({ row, i }))
        .filter(({ row }) => row[0])
        .map(({ row, i }) => ({
          company: companyNames[key],
          companyKey: key,
          rowIndex: i,
          name: row[0] || '',
          lead: row[1] || '',
          status: row[2] || '',
          priority: row[3] || '',
          dueDate: row[4] || '',
          teamMembers: row[5] || '',
          lastTouched: row[6] || '',
          notes: row[7] || '',
        }))
    } catch {
      return []
    }
  }

  let tasks = []
  if (company === 'all') {
    const results = await Promise.all(Object.keys(sheets).map(fetchTasks))
    tasks = results.flat()
  } else if (sheets[company]) {
    tasks = await fetchTasks(company)
  }

  return new Response(JSON.stringify({ tasks }), {
    headers: { 'content-type': 'application/json' },
  })
}