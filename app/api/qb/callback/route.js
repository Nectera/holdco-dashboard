import OAuthClient from 'intuit-oauth'
import { Redis } from '@upstash/redis'

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

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const realmId = searchParams.get('realmId')
  const state = searchParams.get('state') || ''

  try {
    const authResponse = await oauthClient.createToken(request.url)
    const tokens = authResponse.getJson()

    const company = state.replace('holdco-', '') || 'unknown'

    await redis.set(`tokens:${company}`, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      realmId: realmId,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    })

    return new Response(JSON.stringify({ success: true, company, realmId }, null, 2), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}