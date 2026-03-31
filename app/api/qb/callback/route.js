import OAuthClient from 'intuit-oauth'
import { supabase } from '../../../lib/supabase'

const oauthClient = new OAuthClient({
  clientId: process.env.INTUIT_CLIENT_ID,
  clientSecret: process.env.INTUIT_CLIENT_SECRET,
  environment: 'production',
  redirectUri: 'https://nexus-orcin-psi.vercel.app/api/qb/callback',
})

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
