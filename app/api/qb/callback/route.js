import { oauthClient } from '../../../lib/qb-token'
import { supabase } from '../../../lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const realmId = searchParams.get('realmId')
  const state = searchParams.get('state') || ''

  try {
    const authResponse = await oauthClient.createToken(request.url)
    const tokens = authResponse.getJson()

    const company = state.replace('holdco-', '') || 'unknown'

    await supabase
      .from('qb_tokens')
      .upsert({
        company: company,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        realm_id: realmId,
        expires_at: Date.now() + (tokens.expires_in * 1000),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company' })

    return new Response(JSON.stringify({ success: true, company, realmId }, null, 2), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
