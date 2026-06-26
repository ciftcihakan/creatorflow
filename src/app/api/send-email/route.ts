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
      thread_id,           // gmail thread id for replies
      original_message_id, // stored Message-ID header for In-Reply-To
    } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let gmailThreadId: string | null      = thread_id || null
    let storedMessageId: string | null    = original_message_id || null
    let sentFrom: string                  = `${fromName || 'CreatorFlow'} <noreply@creatorflow.app>`
    let sentVia: 'gmail' | 'resend'       = 'resend'

    // ── Try Gmail first ───────────────────────────────────────────────────
    if (agency_id) {
      const accessToken = await getValidAccessToken(agency_id)

      if (accessToken) {
        const { data: connection } = await supabaseAdmin
          .from('gmail_connections')
          .select('gmail_address')
          .eq('agency_id', agency_id)
          .single()

        if (connection?.gmail_address) {
          try {
            // ── Build RFC 2822 headers ────────────────────────────────────
            const emailLines = [
              `From: ${fromName || 'CreatorFlow'} <${connection.gmail_address}>`,
              `To: ${to}`,
              `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
              `Content-Type: text/plain; charset=utf-8`,
              // Use stored Message-ID for reliable threading
              ...(storedMessageId ? [`In-Reply-To: ${storedMessageId}`]  : []),
              ...(storedMessageId ? [`References: ${storedMessageId}`]   : []),
              ``,
              body,
            ]

            const rawEmail     = emailLines.join('\r\n')
            const encodedEmail = Buffer.from(rawEmail)
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '')

            const sendBody: any = { raw: encodedEmail }
            if (gmailThreadId) sendBody.threadId = gmailThreadId

            const gmailRes = await fetch(
              'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
              {
                method:  'POST',
                headers: {
                  Authorization:  `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(sendBody),
              }
            )

            if (gmailRes.ok) {
              const gmailData = await gmailRes.json()
              gmailThreadId   = gmailData.threadId
              sentFrom        = connection.gmail_address
              sentVia         = 'gmail'

              // ── After first send, fetch and store the Message-ID ──────
              if (!thread_id && gmailData.id) {
                try {
                  const msgRes = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailData.id}?fields=payload/headers`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                  )
                  if (msgRes.ok) {
                    const msgData = await msgRes.json()
                    const headers = msgData.payload?.headers || []
                    storedMessageId = headers.find((h: any) =>
                      h.name === 'Message-ID' || h.name === 'Message-Id'
                    )?.value || null
                  }
                } catch {}
              }
            } else {
              const errText = await gmailRes.text()
              console.error('Gmail send failed:', errText)
            }
          } catch (gmailErr) {
            console.error('Gmail send error, falling back to Resend:', gmailErr)
          }
        }
      }
    }

    // ── Fallback to Resend ────────────────────────────────────────────────
    if (sentVia === 'resend') {
      const { Resend } = await import('resend')
      const resend     = new Resend(process.env.RESEND_API_KEY)
      const { error }  = await resend.emails.send({
        from:    `${fromName || 'CreatorFlow'} <onboarding@resend.dev>`,
        to:      [to],
        subject: subject,
        text:    body,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // ── Store / update email_threads ──────────────────────────────────────
    if (agency_id && campaign_id && creator_id) {
      const { data: existing } = await supabaseAdmin
        .from('email_threads')
        .select('id, original_message_id')
        .eq('campaign_id', campaign_id)
        .eq('creator_id', creator_id)
        .single()

      if (existing) {
        await supabaseAdmin
          .from('email_threads')
          .update({
            gmail_thread_id:    gmailThreadId,
            status:             'sent',
            // Only store original_message_id once (from the first email)
            ...(storedMessageId && !existing.original_message_id
              ? { original_message_id: storedMessageId }
              : {}),
          })
          .eq('id', existing.id)
      } else {
        await supabaseAdmin.from('email_threads').insert({
          agency_id,
          campaign_id,
          creator_id,
          gmail_thread_id:    gmailThreadId,
          original_message_id: storedMessageId,
          subject,
          status:             'sent',
        })
      }
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
      success:             true,
      sent_via:            sentVia,
      gmail_thread_id:     gmailThreadId,
      original_message_id: storedMessageId,
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}