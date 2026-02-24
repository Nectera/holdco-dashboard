import OAuthClient from 'intuit-oauth'

const oauthClient = new OAuthClient({
  clientId: process.env.INTUIT_CLIENT_ID,
  clientSecret: process.env.INTUIT_CLIENT_SECRET,
  environment: 'production',
  redirectUri: process.env.NEXTAUTH_URL + '/api/qb/callback',
})

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company') || 'xtract'

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: `holdco-${company}`,
  })

  return Response.redirect(authUri)
}
