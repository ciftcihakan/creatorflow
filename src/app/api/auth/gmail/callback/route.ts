import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?gmail=error`
    )
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
        grant_type:    'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    console.log('Tokens received:', { 
      has_access_token:  !!tokens.access_token, 
      has_refresh_token: !!tokens.refresh_token 
    })

    if (!tokens.access_token) {
      console.error('Token exchange failed:', tokens)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?gmail=error&reason=token_failed`
      )
    }

    // 2. Get Gmail address
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await profileRes.json()
    console.log('Gmail address:', userInfo.email)

    // 3. Get current user from Supabase
    // Parse the auth cookie to get the session
    const cookieHeader = req.headers.get('cookie') || ''
    let agencyId: string | null = null
    let userId: string | null   = null

    // Try all cookies to find the Supabase session
    const cookiePairs = cookieHeader.split(';').map(c => c.trim())
    for (const pair of cookiePairs) {
      const eqIndex = pair.indexOf('=')
      if (eqIndex === -1) continue
      const key   = pair.substring(0, eqIndex).trim()
      const value = pair.substring(eqIndex + 1).trim()

      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const decoded   = decodeURIComponent(value)
          const tokenData = JSON.parse(decoded)
          const sessionToken = Array.isArray(tokenData) 
            ? tokenData[0] 
            : tokenData?.access_token

          if (sessionToken) {
            const { data: { user } } = await supabaseAdmin.auth.getUser(sessionToken)
            if (user) {
              userId   = user.id
              agencyId = user.id // fallback

              // Get agency_id from profiles
              const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('agency_id')
                .eq('id', user.id)
                .single()

              if (profile?.agency_id) {
                agencyId = profile.agency_id
              }
              console.log('Found user:', userId, 'agency:', agencyId)
            }
          }
        } catch (e) {
          console.log('Cookie parse attempt failed for:', key)
        }
      }
    }

    // 4. Store tokens even without user session for now (use a temp key)
    // This allows testing the OAuth flow without being logged in
    const storeAgencyId = agencyId || `temp_${Date.now()}`

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)

    const { error: upsertError } = await supabaseAdmin
      .from('gmail_connections')
      .upsert({
        agency_id:        storeAgencyId,
        gmail_address:    userInfo.email,
        access_token:     tokens.access_token,
        refresh_token:    tokens.refresh_token || '',
        token_expires_at: expiresAt.toISOString(),
        scopes:           tokens.scope?.split(' ') || [],
        connected_by:     userId,
        status:           'active',
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'agency_id' })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?gmail=error&reason=db_failed`
      )
    }

    console.log('Gmail connected successfully for:', userInfo.email)

    // Redirect to dashboard
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?gmail=connected`
    )

  } catch (err) {
    console.error('Gmail callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?gmail=error`
    )
  }
}