import OAuthClient from 'intuit-oauth'
import { supabase } from './supabase'

const oauthClient = new OAuthClient({
  clientId: process.env.INTUIT_CLIENT_ID,
  clientSecret: process.env.INTUIT_CLIENT_SECRET,
  environment: 'production',
  redirectUri: 'https://www.necteraholdings.com/api/qb/callback',
})

export { oauthClient, OAuthClient }

/**
 * Get a valid QuickBooks token for a company.
 * Handles refresh with race-condition protection:
 *  - Sets a refresh_lock timestamp before refreshing
 *  - Other instances seeing a recent lock will wait and re-read instead of double-refreshing
 *  - Returns null if no token exists or refresh fails (prompts re-auth)
 */
export async function getValidToken(company) {
  const { data, error } = await supabase
    .from('qb_tokens')
    .select('*')
    .eq('company', company)
    .single()

  if (error || !data) return null

  const t = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    realmId: data.realm_id,
    expiresAt: data.expires_at,
  }

  // Token still valid (with 5-minute buffer)
  if (t.expiresAt && Date.now() < t.expiresAt - 300000) {
    return t
  }

  // Token expired — check if another instance is already refreshing
  if (data.refresh_lock && Date.now() - data.refresh_lock < 15000) {
    // Someone else is refreshing — wait a moment, then re-read
    await new Promise(resolve => setTimeout(resolve, 2000))

    const { data: fresh } = await supabase
      .from('qb_tokens')
      .select('*')
      .eq('company', company)
      .single()

    if (fresh && fresh.expires_at && Date.now() < fresh.expires_at - 300000) {
      return {
        accessToken: fresh.access_token,
        refreshToken: fresh.refresh_token,
        realmId: fresh.realm_id,
        expiresAt: fresh.expires_at,
      }
    }
    // If still expired after waiting, the other refresh failed — try ourselves
  }

  // Set lock so other instances know we're refreshing
  await supabase
    .from('qb_tokens')
    .update({ refresh_lock: Date.now() })
    .eq('company', company)

  try {
    const response = await oauthClient.refreshUsingToken(t.refreshToken)
    const newTokens = response.getJson()

    const updated = {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || t.refreshToken,
      realmId: t.realmId,
      expiresAt: Date.now() + (newTokens.expires_in * 1000),
    }

    await supabase
      .from('qb_tokens')
      .update({
        access_token: updated.accessToken,
        refresh_token: updated.refreshToken,
        expires_at: updated.expiresAt,
        refresh_lock: null,
        updated_at: new Date().toISOString(),
      })
      .eq('company', company)

    return updated
  } catch (err) {
    console.error(`QB token refresh failed for ${company}:`, err.message)

    // Clear the lock
    await supabase
      .from('qb_tokens')
      .update({ refresh_lock: null })
      .eq('company', company)

    // Return null so the UI knows to prompt re-auth
    return null
  }
}
