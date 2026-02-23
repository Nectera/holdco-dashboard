import OAuthClient from 'intuit-oauth'

const oauthClient = new OAuthClient({
  clientId: process.env.INTUIT_CLIENT_ID,
  clientSecret: process.env.INTUIT_CLIENT_SECRET,
  environment: 'production',
  redirectUri: 'https://nexus-orcin-psi.vercel.app/api/qb/callback',
})

export async function GET(request) {
  const url = request.url

  try {
    const authResponse = await oauthClient.createToken(url)
    const tokens = authResponse.getJson()
    
    console.log('✓ QB tokens received:', tokens)
    
    return new Response(JSON.stringify(tokens, null, 2), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    console.error('QB auth error:', error)
    return new Response('Auth failed: ' + error.message, { status: 500 })
  }
}