import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '../../auth/gmail/gmail-token'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// This route is called by Vercel Cron every 5 minutes
// It polls Gmail for all connected agencies and detects replies
export async function GET(req: NextRequest) {

  // Verify this is a legitimate cron call in production
  const authHeader = req.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active Gmail connections
    const { data: connections } = await supabaseAdmin
      .from('gmail_connections')
      .select('agency_id, gmail_address')
      .eq('status', 'active')

    if (!connections || connections.length === 0) {
      return NextResponse.json({ message: 'No active Gmail connections', polled: 0 })
    }

    let totalReplies = 0
    const results    = []

    for (const connection of connections) {
      try {
        const accessToken = await getValidAccessToken(connection.agency_id)
        if (!accessToken) continue

        // Get threads to check for this agency
        const { data: threads } = await supabaseAdmin
          .from('email_threads')
          .select('*')
          .eq('agency_id', connection.agency_id)
          .in('status', ['sent', 'delivered', 'opened'])
          .not('gmail_thread_id', 'is', null)

        if (!threads || threads.length === 0) continue

        let agencyReplies = 0

        for (const thread of threads) {
          try {
            const threadRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.gmail_thread_id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )

            if (!threadRes.ok) continue

            const threadData = await threadRes.json()
            const messages   = threadData.messages || []

            if (messages.length <= 1) continue
            if (thread.reply_count >= messages.length - 1) continue

            const latestMessage = messages[messages.length - 1]

            const msgRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${latestMessage.id}?format=full`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )

            if (!msgRes.ok) continue

            const msgData   = await msgRes.json()
            const replyBody = extractEmailBody(msgData)
            if (!replyBody) continue

            agencyReplies++
            totalReplies++

            // Classify the reply
            const classification = await classifyReply(replyBody)

            // Update email thread
            await supabaseAdmin
              .from('email_threads')
              .update({
                status:            'replied',
                reply_count:       messages.length - 1,
                last_reply_at:     new Date().toISOString(),
                last_reply_body:   replyBody,
                ai_classification: classification.intent,
                ai_summary:        classification.summary,
              })
              .eq('id', thread.id)

            // Update campaign_creators status
            if (thread.campaign_id && thread.creator_id) {
              await supabaseAdmin
                .from('campaign_creators')
                .update({ status: 'replied' })
                .eq('campaign_id', thread.campaign_id)
                .eq('creator_id', thread.creator_id)
            }

            // Create notification
            await supabaseAdmin
              .from('notifications')
              .insert({
                agency_id:   connection.agency_id,
                type:        'reply_received',
                title:       'Reply received',
                message:     classification.summary,
                campaign_id: thread.campaign_id,
                creator_id:  thread.creator_id,
                action_url:  thread.campaign_id && thread.creator_id
                  ? `/outreach/${thread.creator_id}?campaign=${thread.campaign_id}`
                  : null,
              })

          } catch (threadErr) {
            console.error(`Thread error:`, threadErr)
          }
        }

        // Update last synced
        await supabaseAdmin
          .from('gmail_connections')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('agency_id', connection.agency_id)

        // Log the poll
        await supabaseAdmin
          .from('gmail_poll_log')
          .insert({
            agency_id:        connection.agency_id,
            emails_found:     agencyReplies,
            emails_processed: agencyReplies,
            status:           'success',
          })

        results.push({
          agency_id:    connection.agency_id,
          gmail:        connection.gmail_address,
          replies_found: agencyReplies,
        })

      } catch (agencyErr) {
        console.error(`Agency poll error for ${connection.agency_id}:`, agencyErr)
        await supabaseAdmin
          .from('gmail_poll_log')
          .insert({
            agency_id: connection.agency_id,
            status:    'error',
            error:     String(agencyErr),
          })
      }
    }

    return NextResponse.json({
      success:       true,
      agencies_polled: connections.length,
      total_replies:   totalReplies,
      results,
    })

  } catch (err) {
    console.error('Cron poll error:', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractEmailBody(msgData: any): string {
  const parts = msgData.payload?.parts || []
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
  }
  if (msgData.payload?.body?.data) {
    return Buffer.from(msgData.payload.body.data, 'base64').toString('utf-8')
  }
  for (const part of parts) {
    if (part.parts) {
      for (const subpart of part.parts) {
        if (subpart.mimeType === 'text/plain' && subpart.body?.data) {
          return Buffer.from(subpart.body.data, 'base64').toString('utf-8')
        }
      }
    }
  }
  return ''
}

async function classifyReply(
  replyText: string
): Promise<{ intent: string; summary: string }> {
  try {
    const res  = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/claude`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Analyse this influencer reply. Return ONLY valid JSON with no markdown: intent (interested/negotiating/not_interested/needs_info/unknown), summary (one sentence max 20 words).

Reply: "${replyText.slice(0, 500)}"`,
        maxTokens: 150,
      }),
    })
    const data   = await res.json()
    const text   = (data.text || '').replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)
    return {
      intent:  parsed.intent  || 'unknown',
      summary: parsed.summary || 'Reply received',
    }
  } catch {
    return { intent: 'unknown', summary: 'Reply received' }
  }
}