import { google } from 'googleapis'

const sheetIds = {
  nectera: process.env.NECTERA_SHEET_ID,
  xtract: process.env.XTRACT_SHEET_ID,
  bcs: process.env.BCS_SHEET_ID,
  lush: process.env.LUSH_SHEET_ID,
}

export async function POST(request) {
  try {
    const { companyKey, rowIndex } = await request.json()
    const sheetId = sheetIds[companyKey]
    if (!sheetId) return new Response(JSON.stringify({ error: 'Invalid company' }), { status: 400 })

    const credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    }

    const auth = new google.auth.JWT(credentials.client_email, null, credentials.private_key, ['https://www.googleapis.com/auth/spreadsheets'])
    const sheets = google.sheets({ version: 'v4', auth })

    // Get sheet info to find the actual sheet ID (gid)
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    const sheet = spreadsheet.data.sheets[0]
    const sheetGid = sheet.properties.sheetId

    // Delete the row (rowIndex is 0-based from data, +1 for header, +1 for 1-based = rowIndex + 2)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetGid,
              dimension: 'ROWS',
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            }
          }
        }]
      }
    })

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
