// app/api/contract/sign/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { token, signer_name } = await req.json()

    if (!token || !signer_name?.trim()) {
      return NextResponse.json({ error: 'Token and name required' }, { status: 400 })
    }

    // Find deal by token with all related data
    const { data: deal, error } = await supabaseAdmin
      .from('campaign_creators')
      .select(`
        *,
        campaigns ( * ),
        creators ( * )
      `)
      .eq('signing_token', token)
      .single()

    if (error || !deal) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    // Already signed?
    if (deal.signed_at) {
      return NextResponse.json({ error: 'This contract has already been signed.' }, { status: 400 })
    }

    // Expired?
    if (deal.signing_token_expires_at && new Date(deal.signing_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This signing link has expired.' }, { status: 410 })
    }

    // Capture IP address
    const ip = (
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    )

    const signedAt = new Date().toISOString()

    // Record the signature + update status to signed
    const { error: updateError } = await supabaseAdmin
      .from('campaign_creators')
      .update({
        signed_at:   signedAt,
        signer_name: signer_name.trim(),
        signer_ip:   ip,
        status:      'signed',
      })
      .eq('id', deal.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to record signature' }, { status: 500 })
    }

    const campaign = (deal as any).campaigns
    const creator  = (deal as any).creators

    const signedDate = new Date(signedAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    const signedTime = new Date(signedAt).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })

    // 1) Send confirmation to the creator
    if (creator?.email) {
      await resend.emails.send({
        from:    `Creatorflow <hello@${process.env.RESEND_FROM_DOMAIN || 'creatorflow.app'}>`,
        to:      creator.email,
        subject: `✓ Signed: Your agreement with ${campaign?.brand}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,sans-serif">
            <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e8">
              <div style="background:#3ecf8e;padding:24px 32px">
                <h1 style="margin:0;font-size:20px;color:#fff;font-weight:600">✓ Agreement signed</h1>
              </div>
              <div style="padding:28px 32px">
                <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a">Hi ${creator.full_name},</p>
                <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6">
                  Your collaboration agreement with <strong>${campaign?.brand}</strong> has been successfully signed and recorded.
                </p>
                <div style="background:#f8f8fa;border-radius:8px;padding:16px 20px;margin-bottom:20px;font-size:13px">
                  <div style="margin-bottom:6px"><strong>Signed by:</strong> ${signer_name}</div>
                  <div style="margin-bottom:6px"><strong>Date:</strong> ${signedDate}</div>
                  <div style="margin-bottom:6px"><strong>Time:</strong> ${signedTime}</div>
                  <div><strong>Fee:</strong> £${Number(deal.agreed_fee).toLocaleString()}</div>
                </div>
                <p style="margin:0;font-size:12px;color:#999">Keep this email as your record of the agreement. Questions? Reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      })
    }

    // 2) Notify the agency via the notifications table
    if (campaign?.agency_id) {
      await supabaseAdmin.from('notifications').insert({
        agency_id:  campaign.agency_id,
        title:      `Contract signed — ${creator?.full_name}`,
        message:    `${creator?.full_name} signed the agreement for ${campaign?.campaign_name} on ${signedDate}`,
        type:       'contract_signed',
        read:       false,
        action_url: `/outreach/${creator?.id}?campaign=${campaign?.id}`,
      })
    }

    return NextResponse.json({
      success:    true,
      signed_at:  signedAt,
      signer_name: signer_name.trim(),
    })

  } catch (err: any) {
    console.error('Sign contract error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}