import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getValidAccessToken(agencyId: string): Promise<string | null> {
  const { data: connection } = await supabaseAdmin
    .from('gmail_connections')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('status', 'active')
    .single()

  if (!connection) return null

  // Check if token is still valid (with 5 min buffer)
  const expiresAt  = new Date(connection.token_expires_at)
  const now        = new Date()
  const bufferMs   = 5 * 60 * 1000
  const isExpired  = expiresAt.getTime() - now.getTime() < bufferMs

  if (!isExpired) {
    return connection.access_token
  }

  // Refresh the token
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.refresh_token,
        grant_type:    'refresh_token',
      }),
    })

    const tokens = await res.json()

    if (!tokens.access_token) {
      // Mark connection as expired
      await supabaseAdmin
        .from('gmail_connections')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('agency_id', agencyId)
      return null
    }

    const newExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)

    // Update stored token
    await supabaseAdmin
      .from('gmail_connections')
      .update({
        access_token:     tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        status:           'active',
        updated_at:       new Date().toISOString(),
      })
      .eq('agency_id', agencyId)

    return tokens.access_token

  } catch (err) {
    console.error('Token refresh error:', err)
    return null
  }
}