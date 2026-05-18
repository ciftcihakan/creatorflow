'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser]                   = useState<any>(null)
  const [profile, setProfile]             = useState<any>(null)
  const [stats, setStats]                 = useState({ campaigns: 0, creators: 0, active_deals: 0, signed: 0 })
  const [gmailStatus, setGmailStatus]     = useState<{ connected: boolean; gmail_address?: string; last_synced_at?: string } | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const router                            = useRouter()
  const searchParams                      = useSearchParams()
  const gmailParam                        = searchParams.get('gmail')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      // Load profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      const agencyId = prof?.agency_id || user.id

      // Load stats
      const [campaigns, creators, deals] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact' }).eq('agency_id', agencyId).is('deleted_at', null),
        supabase.from('creators').select('id', { count: 'exact' }).eq('agency_id', agencyId).is('deleted_at', null),
        supabase.from('campaign_creators').select('id, status'),
      ])

      const dealData  = deals.data || []
      setStats({
        campaigns:    campaigns.count  || 0,
        creators:     creators.count   || 0,
        active_deals: dealData.filter(d => ['outreach_sent', 'replied', 'negotiating', 'contract_out'].includes(d.status)).length,
        signed:       dealData.filter(d => d.status === 'signed').length,
      })

      // Check Gmail status
      const gmailRes = await fetch(`/api/auth/gmail/status?agency_id=${agencyId}`)
      const gmailData = await gmailRes.json()
      setGmailStatus(gmailData)

      // Load recent notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(5)
      setNotifications(notifs || [])

      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function markNotificationRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(n => n.map(notif => notif.id === id ? { ...notif, read: true } : notif))
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9090a8', fontFamily: 'sans-serif' }}>
      Loading...
    </main>
  )

  const card = {
    background: '#16161a',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px',
    padding: '20px',
  }

  const sectionTitle = {
    fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase' as const,
    letterSpacing: '0.07em', marginBottom: '14px',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif' }}>

      {/* NAV */}
      <div style={{ background: '#16161a', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a898ff' }}>creatorflow</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a href="/campaigns" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>Campaigns</a>
          <a href="/pipeline" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>Pipeline</a>
          <a href="/creators/add" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>Add creator</a>
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '5px 12px', color: '#9090a8', fontSize: '12px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ color: '#e8e8f0', fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p style={{ color: '#5a5a70', fontSize: '13px' }}>Here's what's happening with your campaigns</p>
        </div>

        {/* Gmail connected banner */}
        {gmailParam === 'connected' && (
          <div style={{ background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.25)', borderRadius: '8px', padding: '12px 16px', color: '#3ecf8e', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✓ Gmail connected successfully — reply automation is now active
          </div>
        )}

        {gmailParam === 'error' && (
          <div style={{ background: 'rgba(240,96,96,0.1)', border: '1px solid rgba(240,96,96,0.25)', borderRadius: '8px', padding: '12px 16px', color: '#f06060', fontSize: '13px', marginBottom: '20px' }}>
            Gmail connection failed — please try again
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Campaigns',    value: stats.campaigns,    color: '#a898ff' },
            { label: 'Creators',     value: stats.creators,     color: '#3ecf8e' },
            { label: 'Active deals', value: stats.active_deals, color: '#f5a623' },
            { label: 'Signed',       value: stats.signed,       color: '#3ecf8e' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={{ fontSize: '26px', fontWeight: '500', color: s.color, fontFamily: 'monospace', marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#5a5a70' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Gmail connection */}
          <div style={card}>
            <div style={sectionTitle}>Gmail</div>
            {gmailStatus?.connected ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3ecf8e' }} />
                  <span style={{ fontSize: '13px', color: '#e8e8f0' }}>{gmailStatus.gmail_address}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#5a5a70', marginBottom: '14px' }}>
                  {gmailStatus.last_synced_at
                    ? `Last synced ${new Date(gmailStatus.last_synced_at).toLocaleString()}`
                    : 'Not synced yet'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={async () => {
                      const agencyId = profile?.agency_id || user?.id
                      await fetch('/api/gmail/poll', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ agency_id: agencyId }),
                      })
                      alert('Poll complete — check notifications')
                    }}
                    style={{ background: 'rgba(124,106,247,0.12)', color: '#a898ff', border: '1px solid rgba(124,106,247,0.3)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Poll for replies
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5a5a70' }} />
                  <span style={{ fontSize: '13px', color: '#9090a8' }}>Not connected</span>
                </div>
                <p style={{ fontSize: '12px', color: '#5a5a70', marginBottom: '14px', lineHeight: '1.5' }}>
                  Connect Gmail to send outreach from your real address and auto-detect creator replies.
                </p>
                <a
                  href="/api/auth/gmail/connect"
                  style={{ display: 'inline-block', background: '#7c6af7', color: '#fff', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', fontWeight: '500', textDecoration: 'none' }}
                >
                  Connect Gmail
                </a>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div style={card}>
            <div style={sectionTitle}>Recent activity</div>
            {notifications.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#5a5a70', padding: '12px 0' }}>
                No activity yet — send your first outreach email to get started
              </div>
            ) : (
              <div>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { markNotificationRead(n.id); if (n.action_url) router.push(n.action_url) }}
                    style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: n.action_url ? 'pointer' : 'default', opacity: n.read ? 0.5 : 1 }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.read ? '#5a5a70' : '#a898ff', marginTop: '5px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', color: '#e8e8f0', fontWeight: '500' }}>{n.title}</div>
                      <div style={{ fontSize: '11px', color: '#5a5a70', marginTop: '2px' }}>{n.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Quick actions */}
        <div style={{ ...card, marginTop: '16px' }}>
          <div style={sectionTitle}>Quick actions</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
            {[
              { label: '+ New campaign',  href: '/campaigns/new' },
              { label: '+ Add creator',   href: '/creators/add' },
              { label: 'View pipeline',   href: '/pipeline' },
              { label: 'All campaigns',   href: '/campaigns' },
            ].map(a => (
              <a key={a.label} href={a.href} style={{ background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '8px 16px', color: '#9090a8', fontSize: '13px', textDecoration: 'none' }}>
                {a.label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
