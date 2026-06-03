// app/api/contract/lookup/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  // Look up the deal row by signing token
  // This requires the foreign key relationships to be set up in Supabase
  const { data: deal, error } = await supabaseAdmin
    .from('campaign_creators')
    .select(`
      *,
      campaigns ( * ),
      creators ( *, creator_platforms ( platform, handle ) )
    `)
    .eq('signing_token', token)
    .single()

  if (error || !deal) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  // Check token expiry
  if (deal.signing_token_expires_at && new Date(deal.signing_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This signing link has expired. Please contact your brand partner for a new one.' }, { status: 410 })
  }

  const campaign = (deal as any).campaigns
  const creator  = (deal as any).creators
  const platform = creator?.creator_platforms?.[0]

  return NextResponse.json({
    brand:            campaign?.brand,
    campaign_name:    campaign?.campaign_name,
    creator_name:     creator?.full_name,
    handle:           platform?.handle,
    deliverables:     deal.deliverables || campaign?.deliverables,
    product:          campaign?.product || 'the product',
    posting_from:     campaign?.posting_from,
    posting_to:       campaign?.posting_to,
    agreed_fee:       deal.agreed_fee,
    exclusivity_days: campaign?.exclusivity_days || 30,
    usage_months:     campaign?.usage_months || 6,
    content_due_date: deal.content_due_date,
    signed_at:        deal.signed_at,
    signer_name:      deal.signer_name,
  })
}