// app/api/contract/send-signing-link/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { deal_id, campaign_id, creator_id } = await req.json()

    // Fetch needed data
    const [dealRes, campaignRes, creatorRes] = await Promise.all([
      supabaseAdmin.from('campaign_creators').select('*').eq('id', deal_id).single(),
      supabaseAdmin.from('campaigns').select('*').eq('id', campaign_id).single(),
      supabaseAdmin.from('creators').select('*, creator_platforms(*)').eq('id', creator_id).single(),
    ])

    const deal     = dealRes.data
    const campaign = campaignRes.data
    const creator  = creatorRes.data

    if (!deal || !campaign || !creator) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (!creator.email) {
      return NextResponse.json({ error: 'Creator has no email address — add one to their profile first' }, { status: 400 })
    }

    // Generate a unique token that expires in 7 days
    const token     = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('campaign_creators')
      .update({
        signing_token:            token,
        signing_token_expires_at: expiresAt,
      })
      .eq('id', deal_id)

    const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const signingUrl = `${appUrl}/sign/${token}`
    const agreedFee = deal.agreed_fee ? `£${Number(deal.agreed_fee).toLocaleString()}` : 'TBC'

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from:    `${campaign.brand} <hello@${process.env.RESEND_FROM_DOMAIN || 'creatorflow.app'}>`,
      to:      creator.email,
      subject: `Your contract is ready to sign — ${campaign.brand} × ${campaign.campaign_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width"/></head>
        <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
          <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e8">
            
            <!-- Header -->
            <div style="background:#7c6af7;padding:24px 32px">
              <div style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:8px">creatorflow</div>
              <h1 style="margin:0;font-size:20px;color:#fff;font-weight:600">Contract ready to sign</h1>
            </div>

            <!-- Body -->
            <div style="padding:28px 32px">
              <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a">Hi ${creator.full_name},</p>
              <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6">
                Your collaboration agreement with <strong>${campaign.brand}</strong> for the 
                <strong> ${campaign.campaign_name}</strong> campaign is ready to review and sign.
              </p>

              <!-- Deal summary -->
              <div style="background:#f8f8fa;border-radius:8px;padding:16px 20px;margin-bottom:24px">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:10px;font-weight:600">Deal summary</div>
                ${[
                  { l: 'Fee',           v: agreedFee },
                  { l: 'Deliverables',  v: deal.deliverables || campaign.deliverables || '' },
                  { l: 'Posting from',  v: campaign.posting_from || 'TBC' },
                  { l: 'Posting to',    v: campaign.posting_to   || 'TBC' },
                ].map(r => `
                  <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:13px">
                    <span style="color:#666">${r.l}</span>
                    <strong style="color:#1a1a1a">${r.v}</strong>
                  </div>
                `).join('')}
              </div>

              <!-- CTA button -->
              <a href="${signingUrl}" 
                 style="display:inline-block;background:#7c6af7;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px">
                Review &amp; sign contract →
              </a>

              <p style="margin:20px 0 0;font-size:12px;color:#999;line-height:1.5">
                This link expires in <strong>7 days</strong>. If you have any questions about the contract terms, 
                reply directly to this email.
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#f8f8fa;padding:16px 32px;border-top:1px solid #eee">
              <p style="margin:0;font-size:11px;color:#aaa">Powered by Creatorflow · This is a legally binding agreement</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, signing_url: signingUrl })

  } catch (err: any) {
    console.error('Send signing link error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}