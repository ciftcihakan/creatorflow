'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:     { bg: 'rgba(90,90,112,0.15)',   color: '#9090a8', border: 'rgba(90,90,112,0.3)',    label: 'Draft' },
  active:    { bg: 'rgba(62,207,142,0.1)',   color: '#3ecf8e', border: 'rgba(62,207,142,0.25)',  label: 'Active' },
  paused:    { bg: 'rgba(245,166,35,0.1)',   color: '#f5a623', border: 'rgba(245,166,35,0.25)',  label: 'Paused' },
  completed: { bg: 'rgba(124,106,247,0.1)',  color: '#a898ff', border: 'rgba(124,106,247,0.25)', label: 'Completed' },
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase
        .from('campaigns')
        .select('*, profiles(full_name)')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false })
      setCampaigns(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter)

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9090a8', fontFamily: 'sans-serif' }}>
      Loading...
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif' }}>
      {/* NAV */}
      <div style={{ background: '#16161a', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a898ff' }}>creatorflow</div>
        <a href="/dashboard" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>Dashboard</a>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '36px 24px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#e8e8f0', marginBottom: '4px' }}>Campaigns</h1>
            <p style={{ fontSize: '13px', color: '#9090a8' }}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total</p>
          </div>
          <a href="/campaigns/new" style={{ background: '#7c6af7', color: '#fff', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>
            + New campaign
          </a>
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {(['all', 'active', 'paused', 'completed'] as const).map(s => {
            const count = s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length
            const st = s === 'all' ? { bg: 'rgba(124,106,247,0.1)', color: '#a898ff', border: 'rgba(124,106,247,0.2)', label: 'All' } : STATUS_STYLES[s]
            return (
              <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? st.bg : '#16161a', border: `1px solid ${filter === s ? st.border : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: '20px', fontWeight: '500', color: st.color }}>{count}</div>
                <div style={{ fontSize: '11px', color: '#5a5a70', marginTop: '2px' }}>{st.label}</div>
              </button>
            )
          })}
        </div>

        {/* LIST */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#e8e8f0', marginBottom: '6px' }}>No campaigns yet</div>
            <div style={{ fontSize: '13px', color: '#9090a8', marginBottom: '20px' }}>Create your first campaign brief to get started</div>
            <a href="/campaigns/new" style={{ background: '#7c6af7', color: '#fff', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>
              Create campaign
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(c => {
              const st = STATUS_STYLES[c.status] || STATUS_STYLES.draft
              const budgetDisplay = c.budget ? `£${Number(c.budget).toLocaleString()}` : null
              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                  style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124,106,247,0.12)', border: '1px solid rgba(124,106,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    📣
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e8f0', marginBottom: '4px' }}>
                      {c.campaign_name}
                      <span style={{ fontSize: '12px', color: '#5a5a70', fontWeight: '400', marginLeft: '8px' }}>{c.brand}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {c.platform && <span style={{ fontSize: '12px', color: '#9090a8' }}>{c.platform}</span>}
                      {budgetDisplay && <span style={{ fontSize: '12px', color: '#9090a8' }}>{budgetDisplay}</span>}
                      {c.posting_from && <span style={{ fontSize: '12px', color: '#9090a8' }}>{c.posting_from}{c.posting_to ? ` → ${c.posting_to}` : ''}</span>}
                      {c.profiles?.full_name && <span style={{ fontSize: '12px', color: '#9090a8' }}>👤 {c.profiles.full_name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {st.label}
                    </span>
                    <span style={{ color: '#5a5a70', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
