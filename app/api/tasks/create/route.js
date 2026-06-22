import { google } from 'googleapis'

const sheets = {
  nectera: '1hqMBV4fSNAwuOTTfEFG_ZQvSXAvJx8Wpa9zEj2M9hDg',
  xtract: '1JbFv__n5ClYG-qwCZztRnL3nWs2vjdo-A8pZF67iS9M',
  bcs: '1uLNoDqUrnIH8Tz9A8ZOMhMbtXLbysXtIxm2jawyPkss',
  lush: '1_1YNJItBZLwT8DXaJQ3eikHi0zYh7zPDbBXQ9DpQXMg',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { companyKey, name, lead, status, priority, dueDate, teamMembers, notes } = body

    const sheetId = sheets[companyKey]
    if (!sheetId) return new Response(JSON.stringify({ error: 'Unknown company' }), { status: 400 })

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT.replace(/"/g, '')
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/"/g, '').replace(/\\n/g, '\n')

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const client = await auth.getClient()
    const sheetsApi = google.sheets({ version: 'v4', auth: client })

    await sheetsApi.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[name, lead, status, priority, dueDate, teamMembers, '', notes]],
      },
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}