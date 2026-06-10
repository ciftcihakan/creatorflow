'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUSES = [
  { key: 'all',          label: 'All deals',    color: '#9090a8' },
  { key: 'outreach_sent', label: 'Outreach sent', color: '#a898ff' },
  { key: 'replied',       label: 'Replied',       color: '#3ecf8e' },
  { key: 'negotiating',   label: 'Negotiating',   color: '#f5a623' },
  { key: 'contract_out',  label: 'Contract out',  color: '#a898ff' },
  { key: 'signed',        label: 'Signed',        color: '#3ecf8e' },
]

const STATUS_STEP: Record<string, number> = {
  outreach_sent: 1,
  replied:       2,
  negotiating:   4,
  contract_out:  6,
  signed:        9,
}

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  outreach_sent: { bg: 'rgba(168,152,255,0.1)', border: 'rgba(168,152,255,0.3)', text: '#a898ff' },
  replied:       { bg: 'rgba(62,207,142,0.1)',  border: 'rgba(62,207,142,0.25)', text: '#3ecf8e' },
  negotiating:   { bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.25)', text: '#f5a623' },
  contract_out:  { bg: 'rgba(168,152,255,0.1)', border: 'rgba(168,152,255,0.3)', text: '#a898ff' },
  signed:        { bg: 'rgba(62,207,142,0.12)', border: 'rgba(62,207,142,0.3)',  text: '#3ecf8e' },
}

export default function PipelinePage() {
  const [deals, setDeals]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [agencyId, setAgencyId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single()
      const aid = profile?.agency_id || user.id
      setAgencyId(aid)

      const { data } = await supabase
        .from('campaign_creators')
        .select(`
          *,
          campaigns ( id, campaign_name, brand, product, agency_id ),
          creators  ( id, full_name, tier, niche, standard_rate, creator_platforms ( platform, handle, followers ) )
        `)
        .order('created_at', { ascending: false })

      // Filter to this agency's campaigns only
      const filtered = (data || []).filter(d => d.campaigns?.agency_id === aid)
      setDeals(filtered)
      setLoading(false)
    }
    load()
  }, [router])

  const visible = deals.filter(d => {
    const matchStatus = filter === 'all' || d.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      d.creators?.full_name?.toLowerCase().includes(q) ||
      d.campaigns?.brand?.toLowerCase().includes(q) ||
      d.campaigns?.campaign_name?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  // Counts per status
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.key] = s.key === 'all' ? deals.length : deals.filter(d => d.status === s.key).length
    return acc
  }, {} as Record<string, number>)

  // Summary stats
  const totalFees    = deals.filter(d => d.agreed_fee).reduce((s, d) => s + Number(d.agreed_fee), 0)
  const signedFees   = deals.filter(d => d.status === 'signed' && d.agreed_fee).reduce((s, d) => s + Number(d.agreed_fee), 0)
  const activeCount  = deals.filter(d => d.status !== 'signed').length
  const signedCount  = deals.filter(d => d.status === 'signed').length

  const card = {
    background: '#16161a',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px',
    padding: '16px 20px',
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9090a8', fontFamily: 'sans-serif' }}>
      Loading...
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif' }}>

      {/* NAV */}
      <div style={{ background: '#16161a', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a898ff', textDecoration: 'none' }}>creatorflow</a>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="/campaigns"  style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>Campaigns</a>
          <a href="/pipeline"   style={{ color: '#e8e8f0', fontSize: '12px', textDecoration: 'none' }}>Pipeline</a>
          <a href="/creators/add" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>Add creator</a>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#e8e8f0', margin: '0 0 4px' }}>Deal pipeline</h1>
            <p style={{ fontSize: '13px', color: '#5a5a70', margin: 0 }}>{deals.length} deals across all campaigns</p>
          </div>
          <a href="/campaigns/new" style={{ background: '#7c6af7', color: '#fff', textDecoration: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '500' }}>
            + New campaign
          </a>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total deals',   value: deals.length,                                          color: '#a898ff' },
            { label: 'Active',        value: activeCount,                                            color: '#f5a623' },
            { label: 'Signed',        value: signedCount,                                            color: '#3ecf8e' },
            { label: 'Pipeline value', value: `£${totalFees.toLocaleString()}`,                     color: '#a898ff' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={{ fontSize: '24px', fontWeight: '500', color: s.color, fontFamily: 'monospace', marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#5a5a70' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' as const }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => setFilter(s.key)}
                style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontFamily: 'sans-serif', cursor: 'pointer', border: '1px solid', borderColor: filter === s.key ? s.color : 'rgba(255,255,255,0.07)', background: filter === s.key ? `${s.color}18` : 'transparent', color: filter === s.key ? s.color : '#9090a8' }}>
                {s.label} {counts[s.key] > 0 && <span style={{ opacity: 0.7 }}>({counts[s.key]})</span>}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search creator or brand..."
              style={{ background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '7px 12px', color: '#e8e8f0', fontSize: '12px', outline: 'none', width: '220px', fontFamily: 'sans-serif' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr', gap: '0', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#1a1a20' }}>
            {['Creator', 'Campaign', 'Status', 'Fee', 'Step', ''].map(h => (
              <div key={h} style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', fontWeight: '500' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {visible.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' as const, color: '#5a5a70', fontSize: '13px' }}>
              {search || filter !== 'all' ? 'No deals match your filters' : 'No deals yet — start by adding creators to a campaign'}
            </div>
          ) : (
            visible.map((deal, i) => {
              const creator  = deal.creators
              const campaign = deal.campaigns
              const platform = creator?.creator_platforms?.[0]
              const sc       = STATUS_COLOR[deal.status] || { bg: '#26262e', border: 'rgba(255,255,255,0.07)', text: '#9090a8' }
              const step     = STATUS_STEP[deal.status] || 0
              const initials = creator?.full_name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

              return (
                <div key={deal.id}
                  onClick={() => router.push(`/outreach/${creator?.id}?campaign=${campaign?.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr', gap: '0', padding: '13px 20px', borderBottom: i < visible.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e1e24')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Creator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c6af7,#3ecf8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '500', color: '#fff', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#e8e8f0', fontWeight: '500' }}>{creator?.full_name || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#5a5a70', fontFamily: 'monospace' }}>
                        {platform?.handle ? `@${platform.handle}` : ''}{platform?.platform ? ` · ${platform.platform}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Campaign */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#e8e8f0' }}>{campaign?.brand || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#5a5a70' }}>{campaign?.campaign_name || ''}</div>
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' as const }}>
                      {deal.status?.replace(/_/g, ' ') || '—'}
                    </span>
                  </div>

                  {/* Fee */}
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: deal.agreed_fee ? '#f5a623' : '#5a5a70', fontFamily: 'monospace', fontWeight: '500' }}>
                    {deal.agreed_fee ? `£${Number(deal.agreed_fee).toLocaleString()}` : '—'}
                  </div>

                  {/* Step progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '4px', background: '#26262e', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(step / 9) * 100}%`, background: deal.status === 'signed' ? '#3ecf8e' : '#7c6af7', borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '10px', color: '#5a5a70', fontFamily: 'monospace', flexShrink: 0 }}>{step}/9</span>
                  </div>

                  {/* Open link */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '11px', color: '#5a5a70' }}>Open →</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Signed value footer */}
        {signedCount > 0 && (
          <div style={{ marginTop: '12px', padding: '10px 16px', background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#3ecf8e' }}>✓ {signedCount} signed deal{signedCount > 1 ? 's' : ''}</span>
            <span style={{ fontSize: '13px', color: '#3ecf8e', fontFamily: 'monospace', fontWeight: '500' }}>£{signedFees.toLocaleString()} confirmed</span>
          </div>
        )}

      </div>
    </main>
  )
}
