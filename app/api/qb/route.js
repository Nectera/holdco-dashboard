import { oauthClient, OAuthClient } from '../../lib/qb-token'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company') || 'xtract'

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: `holdco-${company}`,
  })

  return Response.redirect(authUri)
}
