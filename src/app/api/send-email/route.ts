import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '../auth/gmail/gmail-token'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const {
      to,
      subject,
      body,
      fromName,
      agency_id,
      campaign_id,
      creator_id,
    } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let gmailThreadId: string | null  = null
    let sentFrom: string              = `${fromName || 'CreatorFlow'} <noreply@creatorflow.app>`
    let sentVia: 'gmail' | 'resend'   = 'resend'

    // ── Try Gmail first if agency is connected ────────────────────────────
    if (agency_id) {
      const accessToken = await getValidAccessToken(agency_id)

      if (accessToken) {
        // Get the Gmail address for this agency
        const { data: connection } = await supabaseAdmin
          .from('gmail_connections')
          .select('gmail_address')
          .eq('agency_id', agency_id)
          .single()

        if (connection?.gmail_address) {
          try {
            // Build RFC 2822 email
            const emailLines = [
              `From: ${fromName || 'CreatorFlow'} <${connection.gmail_address}>`,
              `To: ${to}`,
              `Subject: ${subject}`,
              `Content-Type: text/plain; charset=utf-8`,
              ``,
              body,
            ]
            const rawEmail   = emailLines.join('\r\n')
            const encodedEmail = Buffer.from(rawEmail)
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '')

            const gmailRes = await fetch(
              'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
              {
                method: 'POST',
                headers: {
                  Authorization:  `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw: encodedEmail }),
              }
            )

            if (gmailRes.ok) {
              const gmailData  = await gmailRes.json()
              gmailThreadId    = gmailData.threadId
              sentFrom         = connection.gmail_address
              sentVia          = 'gmail'
            }
          } catch (gmailErr) {
            console.error('Gmail send error, falling back to Resend:', gmailErr)
          }
        }
      }
    }

    // ── Fallback to Resend if Gmail not connected or failed ───────────────
    if (sentVia === 'resend') {
      const { Resend } = await import('resend')
      const resend     = new Resend(process.env.RESEND_API_KEY)

      const { data, error } = await resend.emails.send({
        from:    `${fromName || 'CreatorFlow'} <onboarding@resend.dev>`,
        to:      [to],
        subject: subject,
        text:    body,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    // ── Store in email_threads if we have context ─────────────────────────
    if (agency_id && campaign_id && creator_id) {
      await supabaseAdmin.from('email_threads').insert({
        agency_id,
        campaign_id,
        creator_id,
        gmail_thread_id: gmailThreadId,
        subject,
        status:          'sent',
      })
    }

    // ── Log in outreach_emails ────────────────────────────────────────────
    if (agency_id) {
      await supabaseAdmin.from('outreach_emails').insert({
        agency_id,
        campaign_id:  campaign_id || null,
        creator_id:   creator_id  || null,
        subject,
        body,
        sent_from:    sentFrom,
        sent_to:      to,
        status:       'sent',
        sent_at:      new Date().toISOString(),
        ai_generated: true,
      })
    }

    return NextResponse.json({
      success:        true,
      sent_via:       sentVia,
      gmail_thread_id: gmailThreadId,
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}