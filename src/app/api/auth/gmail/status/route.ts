import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const agencyId = searchParams.get('agency_id')

    if (!agencyId) {
      return NextResponse.json({ connected: false, error: 'No agency_id' }, { status: 400 })
    }

    const { data } = await supabaseAdmin
      .from('gmail_connections')
      .select('gmail_address, status, last_synced_at, token_expires_at')
      .eq('agency_id', agencyId)
      .single()

    if (!data || data.status !== 'active') {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected:      true,
      gmail_address:  data.gmail_address,
      last_synced_at: data.last_synced_at,
    })

  } catch (err) {
    return NextResponse.json({ connected: false, error: 'Failed to check status' }, { status: 500 })
  }
}