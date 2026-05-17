import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '../../auth/gmail/gmail-token'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { agency_id } = await req.json()

    if (!agency_id) {
      return NextResponse.json({ error: 'No agency_id' }, { status: 400 })
    }

    // 1. Get valid access token
    const accessToken = await getValidAccessToken(agency_id)
    if (!accessToken) {
      return NextResponse.json({ error: 'Gmail not connected or token expired', connected: false }, { status: 401 })
    }

    // 2. Get all email threads we're tracking for this agency
    const { data: threads } = await supabaseAdmin
      .from('email_threads')
      .select('*')
      .eq('agency_id', agency_id)
      .in('status', ['sent', 'delivered', 'opened'])
      .not('gmail_thread_id', 'is', null)

    if (!threads || threads.length === 0) {
      return NextResponse.json({ message: 'No threads to poll', replies_found: 0 })
    }

    let repliesFound = 0
    const results = []

    // 3. Check each thread for new replies
    for (const thread of threads) {
      try {
        const threadRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.gmail_thread_id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!threadRes.ok) continue

        const threadData = await threadRes.json()
        const messages   = threadData.messages || []

        // More than 1 message means there's a reply
        if (messages.length <= 1) continue

        // Check if we already processed this reply
        if (thread.reply_count >= messages.length - 1) continue

        // Get the latest reply (last message)
        const latestMessage = messages[messages.length - 1]

        // Fetch the full reply content
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${latestMessage.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!msgRes.ok) continue

        const msgData  = await msgRes.json()
        const replyBody = extractEmailBody(msgData)

        if (!replyBody) continue

        repliesFound++

        // 4. Run AI classification on the reply
        const classification = await classifyReply(replyBody)

        // 5. Update the email thread record
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

        // 6. Update campaign_creators status
        if (thread.campaign_id && thread.creator_id) {
          await supabaseAdmin
            .from('campaign_creators')
            .update({ status: 'replied' })
            .eq('campaign_id', thread.campaign_id)
            .eq('creator_id', thread.creator_id)
        }

        // 7. Create notification for account manager
        await supabaseAdmin
          .from('notifications')
          .insert({
            agency_id:   agency_id,
            type:        'reply_received',
            title:       'Reply received',
            message:     classification.summary,
            campaign_id: thread.campaign_id,
            creator_id:  thread.creator_id,
            action_url:  thread.campaign_id && thread.creator_id
              ? `/outreach/${thread.creator_id}?campaign=${thread.campaign_id}`
              : null,
          })

        results.push({
          thread_id:      thread.id,
          creator_id:     thread.creator_id,
          classification: classification.intent,
          summary:        classification.summary,
        })

      } catch (threadErr) {
        console.error(`Error processing thread ${thread.gmail_thread_id}:`, threadErr)
      }
    }

    // 8. Update last synced timestamp
    await supabaseAdmin
      .from('gmail_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('agency_id', agency_id)

    // 9. Log the poll
    await supabaseAdmin
      .from('gmail_poll_log')
      .insert({
        agency_id:        agency_id,
        emails_found:     repliesFound,
        emails_processed: repliesFound,
        status:           'success',
      })

    return NextResponse.json({
      success:       true,
      replies_found: repliesFound,
      results,
    })

  } catch (err) {
    console.error('Poll error:', err)
    return NextResponse.json({ error: 'Poll failed' }, { status: 500 })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractEmailBody(msgData: any): string {
  const parts = msgData.payload?.parts || []

  // Try plain text first
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
  }

  // Fallback to direct body
  if (msgData.payload?.body?.data) {
    return Buffer.from(msgData.payload.body.data, 'base64').toString('utf-8')
  }

  // Try nested parts
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
): Promise<{ intent: string; summary: string; counter_rate: string | null }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Analyse this influencer reply. Return ONLY valid JSON with no markdown: intent (interested/negotiating/not_interested/needs_info/unknown), summary (one sentence max 20 words), counter_rate (string or null).

Reply: "${replyText.slice(0, 500)}"`,
        maxTokens: 150,
      }),
    })

    const data   = await res.json()
    const text   = (data.text || '').replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)

    return {
      intent:       parsed.intent       || 'unknown',
      summary:      parsed.summary      || 'Reply received',
      counter_rate: parsed.counter_rate || null,
    }
  } catch {
    return { intent: 'unknown', summary: 'Reply received', counter_rate: null }
  }
}