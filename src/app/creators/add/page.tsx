'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'X', 'LinkedIn', 'Pinterest']
const TIERS = ['nano', 'micro', 'mid', 'macro', 'mega']
const STATUSES = [
  { id: 'added',         label: 'Added' },
  { id: 'outreach_sent', label: 'Outreach sent' },
  { id: 'replied',       label: 'Replied' },
  { id: 'negotiating',   label: 'Negotiating' },
  { id: 'contract_out',  label: 'Contract out' },
  { id: 'signed',        label: 'Signed' },
  { id: 'declined',      label: 'Declined' },
  { id: 'gone_cold',     label: 'Gone cold' },
]

type Platform = { platform: string; handle: string; followers: string }

export default function AddCreator() {
  const [user, setUser]             = useState<any>(null)
  const [campaign, setCampaign]     = useState<any>(null)
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<any[]>([])
  const [searching, setSearching]   = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const searchTimeout               = useRef<any>(null)
  const router                      = useRouter()
  const searchParams                = useSearchParams()
  const campaignId                  = searchParams.get('campaign')

  const [form, setForm] = useState({
    first_name:    '',
    last_name:     '',
    email:         '',
    niche:         '',
    tier:          'micro',
    standard_rate: '',
    notes:         '',
    status:        'added',
  })

  const [platforms, setPlatforms] = useState<Platform[]>([
    { platform: 'Instagram', handle: '', followers: '' }
  ])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      if (campaignId) {
        const { data } = await supabase
          .from('campaigns')
          .select('id, campaign_name, brand')
          .eq('id', campaignId)
          .single()
        setCampaign(data)
      }
    }
    load()
  }, [router, campaignId])

  // Live search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('creators')
        .select('*, creator_platforms(platform, handle, followers)')
        .or(`full_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(6)
      setResults(data || [])
      setSearching(false)
    }, 300)
  }, [query])

  async function addExistingToCampaign(creator: any) {
    if (!campaignId) return
    setLoading(true); setError('')

    const { data: existing } = await supabase
      .from('campaign_creators')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('creator_id', creator.id)
      .single()

    if (existing) {
      setError(`${creator.full_name} is already in this campaign`)
      setLoading(false); return
    }

    const { error } = await supabase.from('campaign_creators').insert({
      campaign_id: campaignId,
      creator_id:  creator.id,
      status:      'added',
    })

    if (error) { setError(error.message); setLoading(false); return }

    setSuccess(`${creator.full_name} added to campaign!`)
    setTimeout(() => router.push(`/campaigns/${campaignId}`), 1000)
  }

  function updatePlatform(index: number, field: keyof Platform, value: string) {
    setPlatforms(p => p.map((pl, i) => i === index ? { ...pl, [field]: value } : pl))
  }

  function addPlatform() {
    setPlatforms(p => [...p, { platform: 'TikTok', handle: '', followers: '' }])
  }

  function removePlatform(index: number) {
    setPlatforms(p => p.filter((_, i) => i !== index))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name) { setError('First name is required'); return }
    setLoading(true); setError('')

    const full_name = `${form.first_name} ${form.last_name}`.trim()

    // 1. Insert creator
    const { data: creator, error: creatorErr } = await supabase
      .from('creators')
      .insert({
        agency_id:     user.id,
        first_name:    form.first_name,
        last_name:     form.last_name || null,
        full_name:     full_name,
        email:         form.email || null,
        niche:         form.niche ? form.niche.split(',').map(n => n.trim()).filter(Boolean) : null,
        tier:          form.tier,
        standard_rate: form.standard_rate ? parseFloat(form.standard_rate) : null,
        notes:         form.notes || null,
        status:        'active',
      })
      .select()
      .single()

    if (creatorErr) { setError(creatorErr.message); setLoading(false); return }

    // 2. Insert platforms
    const validPlatforms = platforms.filter(p => p.handle.trim())
    if (validPlatforms.length > 0) {
      await supabase.from('creator_platforms').insert(
        validPlatforms.map(p => ({
          creator_id: creator.id,
          platform:   p.platform,
          handle:     p.handle,
          followers:  p.followers ? parseInt(p.followers.replace(/[^0-9]/g, '')) : null,
        }))
      )
    }

    // 3. Add to campaign if we have one
    if (campaignId) {
      const { error: ccError } = await supabase.from('campaign_creators').insert({
        campaign_id: campaignId,
        creator_id:  creator.id,
        status:      form.status,
      })
      if (ccError) { setError(ccError.message); setLoading(false); return }
      setSuccess(`${full_name} created and added to campaign!`)
      setTimeout(() => router.push(`/campaigns/${campaignId}`), 1000)
    } else {
      setSuccess(`${full_name} created successfully!`)
      setTimeout(() => router.push('/campaigns'), 1000)
    }
  }

  const inp = {
    width: '100%', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px', padding: '9px 12px', color: '#e8e8f0', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'sans-serif',
  }
  const lbl = { display: 'block' as const, color: '#9090a8', fontSize: '12px', marginBottom: '5px', fontWeight: '500' as const }
  const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }
  const sectionTitle = {
    fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase' as const,
    letterSpacing: '0.07em', marginBottom: '14px', paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif' }}>
      {/* NAV */}
      <div style={{ background: '#16161a', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a898ff' }}>creatorflow</div>
        <a href={campaignId ? `/campaigns/${campaignId}` : '/campaigns'} style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>
          ← {campaign ? campaign.campaign_name : 'Campaigns'}
        </a>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '36px 24px 80px' }}>
        <h1 style={{ color: '#e8e8f0', fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Add creator</h1>
        {campaign && (
          <p style={{ color: '#9090a8', fontSize: '13px', marginBottom: '28px' }}>
            Adding to <span style={{ color: '#a898ff' }}>{campaign.campaign_name}</span> · {campaign.brand}
          </p>
        )}

        {success && (
          <div style={{ background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.25)', borderRadius: '8px', padding: '10px 14px', color: '#3ecf8e', fontSize: '13px', marginBottom: '16px' }}>
            ✓ {success}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(240,96,96,0.1)', border: '1px solid rgba(240,96,96,0.25)', borderRadius: '8px', padding: '10px 14px', color: '#f06060', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* SEARCH */}
        {!showCreate && (
          <div style={{ marginBottom: '24px' }}>
            <div style={sectionTitle}>Search existing creators</div>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inp, paddingLeft: '36px' }}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or handle..."
                autoFocus
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#5a5a70', fontSize: '14px' }}>⌕</span>
            </div>

            {searching && (
              <div style={{ padding: '12px', color: '#5a5a70', fontSize: '12px', textAlign: 'center' }}>Searching...</div>
            )}

            {!searching && query && results.length === 0 && (
              <div style={{ padding: '16px', background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', marginTop: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#9090a8', marginBottom: '12px' }}>No creators found for "{query}"</div>
                <button onClick={() => setShowCreate(true)} style={{ background: '#7c6af7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  + Create new creator
                </button>
              </div>
            )}

            {results.length > 0 && (
              <div style={{ marginTop: '8px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', overflow: 'hidden' }}>
                {results.map((c, i) => {
                  const primary = c.creator_platforms?.[0]
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#16161a', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1e1e24')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#16161a')}
                    >
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(124,106,247,0.2)', border: '1px solid rgba(124,106,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', color: '#a898ff', flexShrink: 0 }}>
                        {c.full_name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e8f0' }}>{c.full_name}</div>
                        <div style={{ fontSize: '11px', color: '#5a5a70', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          {primary?.platform && <span>{primary.platform}</span>}
                          {primary?.handle && <span>{primary.handle}</span>}
                          {primary?.followers && <span>{Number(primary.followers).toLocaleString()} followers</span>}
                          {c.tier && <span style={{ textTransform: 'capitalize' }}>{c.tier}</span>}
                        </div>
                      </div>
                      <button onClick={() => addExistingToCampaign(c)} disabled={loading}
                        style={{ background: 'rgba(124,106,247,0.12)', color: '#a898ff', border: '1px solid rgba(124,106,247,0.3)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', flexShrink: 0 }}>
                        Add
                      </button>
                    </div>
                  )
                })}
                <div style={{ padding: '10px 14px', background: '#16161a', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <button onClick={() => setShowCreate(true)} style={{ background: 'none', border: 'none', color: '#7c6af7', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    + Not here? Create new creator
                  </button>
                </div>
              </div>
            )}

            {!query && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button onClick={() => setShowCreate(true)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '8px 18px', color: '#9090a8', fontSize: '12px', cursor: 'pointer' }}>
                  + Create new creator instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* CREATE FORM */}
        {showCreate && (
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#e8e8f0' }}>New creator</h2>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#5a5a70', fontSize: '12px', cursor: 'pointer' }}>
                ← Back to search
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={sectionTitle}>Creator details</div>
              <div style={grid}>
                <div>
                  <label style={lbl}>First name *</label>
                  <input style={inp} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="e.g. Sophie" />
                </div>
                <div>
                  <label style={lbl}>Last name</label>
                  <input style={inp} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="e.g. Laurent" />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. sophie@email.com" />
                </div>
                <div>
                  <label style={lbl}>Tier</label>
                  <select style={inp} value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
                    {TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Standard rate (£)</label>
                  <input style={inp} type="number" min="0" value={form.standard_rate} onChange={e => setForm(f => ({ ...f, standard_rate: e.target.value }))} placeholder="e.g. 1200" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Niche <span style={{ color: '#5a5a70', fontWeight: 400 }}>(comma separated)</span></label>
                  <input style={inp} value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} placeholder="e.g. Skincare, Wellness, Lifestyle" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Notes</label>
                  <textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Met at LFW — warm lead" />
                </div>
              </div>
            </div>

            {/* PLATFORMS */}
            <div style={{ marginBottom: '24px' }}>
              <div style={sectionTitle}>Platforms</div>
              {platforms.map((pl, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 32px', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                  <div>
                    {i === 0 && <label style={lbl}>Platform</label>}
                    <select style={inp} value={pl.platform} onChange={e => updatePlatform(i, 'platform', e.target.value)}>
                      {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Handle</label>}
                    <input style={inp} value={pl.handle} onChange={e => updatePlatform(i, 'handle', e.target.value)} placeholder="@handle" />
                  </div>
                  <div>
                    {i === 0 && <label style={lbl}>Followers</label>}
                    <input style={inp} value={pl.followers} onChange={e => updatePlatform(i, 'followers', e.target.value)} placeholder="e.g. 142000" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '1px' }}>
                    {platforms.length > 1 && (
                      <button type="button" onClick={() => removePlatform(i)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', color: '#5a5a70', fontSize: '14px', cursor: 'pointer', width: '32px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addPlatform} style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', color: '#5a5a70', fontSize: '12px', cursor: 'pointer', padding: '7px 14px', marginTop: '4px' }}>
                + Add platform
              </button>
            </div>

            {/* PIPELINE STATUS */}
            {campaignId && (
              <div style={{ marginBottom: '24px' }}>
                <div style={sectionTitle}>Pipeline</div>
                <div>
                  <label style={lbl}>Initial status</label>
                  <select style={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(240,96,96,0.1)', border: '1px solid rgba(240,96,96,0.25)', borderRadius: '8px', padding: '10px 14px', color: '#f06060', fontSize: '12px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={loading} style={{ background: '#7c6af7', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Saving...' : campaignId ? 'Create & add to campaign' : 'Create creator'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '11px 18px', fontSize: '14px', color: '#9090a8', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
