'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUSES = [
  { id: 'added',         label: 'Added',        color: '#9090a8' },
  { id: 'outreach_sent', label: 'Outreach sent', color: '#378ADD' },
  { id: 'replied',       label: 'Replied',       color: '#7F77DD' },
  { id: 'negotiating',   label: 'Negotiating',   color: '#EF9F27' },
  { id: 'contract_out',  label: 'Contract out',  color: '#D85A30' },
  { id: 'signed',        label: 'Signed',        color: '#1D9E75' },
  { id: 'declined',      label: 'Declined',      color: '#888780' },
  { id: 'gone_cold',     label: 'Gone cold',     color: '#5a5a70' },
]

const TIERS = ['nano', 'micro', 'mid', 'macro', 'mega']
const AVATAR_COLORS = ['#7c6af7','#3ecf8e','#f5a623','#f06060','#378ADD','#EF9F27','#1D9E75']

export default function CampaignPipeline() {
  const [campaign, setCampaign]                 = useState<any>(null)
  const [campaignCreators, setCampaignCreators] = useState<any[]>([])
  const [selected, setSelected]                 = useState<any>(null)
  const [loading, setLoading]                   = useState(true)
  const [sidebarOpen, setSidebarOpen]           = useState(true)
  const [modalTab, setModalTab]                 = useState<'deal' | 'profile'>('deal')
  const [saving, setSaving]                     = useState(false)
  const [saveMsg, setSaveMsg]                   = useState('')

  // campaign edit state
  const [editingCampaign, setEditingCampaign] = useState(false)
  const [editSaving, setEditSaving]           = useState(false)
  const [editError, setEditError]             = useState('')
  const [managers, setManagers]               = useState<any[]>([])
  const [campaignForm, setCampaignForm]       = useState<any>(null)

  const [deal, setDeal] = useState({
    status:           '',
    initial_offer:    '',
    counter_offer:    '',
    agreed_fee:       '',
    deliverables:     '',
    quantity:         '',
    content_due_date: '',
    internal_notes:   '',
  })

  const [profile, setProfile] = useState({
    first_name: '',
    last_name:  '',
    email:      '',
    tier:       '',
  })

  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: camp } = await supabase
        .from('campaigns')
        .select('*, profiles(full_name, email, avatar_url)')
        .eq('id', id)
        .single()

      if (!camp) { router.push('/campaigns'); return }
      setCampaign(camp)

      // seed edit form
      setCampaignForm({
        campaign_name:      camp.campaign_name      ?? '',
        brand:              camp.brand              ?? '',
        product:            camp.product            ?? '',
        platform:           camp.platform           ?? 'Instagram',
        key_message:        camp.key_message        ?? '',
        deliverables:       camp.deliverables       ?? '',
        posting_from:       camp.posting_from       ?? '',
        posting_to:         camp.posting_to         ?? '',
        budget:             camp.budget?.toString() ?? '',
        exclusivity_days:   camp.exclusivity_days?.toString() ?? '',
        usage_months:       camp.usage_months?.toString()     ?? '',
        content_guidelines: camp.content_guidelines ?? '',
        status:             camp.status             ?? 'draft',
        account_manager_id: camp.account_manager_id ?? '',
      })

      // load managers for the select
      const { data: mgrs } = await supabase.from('profiles').select('id, full_name, email')
      setManagers(mgrs || [])

      const { data: cc } = await supabase
        .from('campaign_creators')
        .select(`
          *,
          creators (
            id, full_name, first_name, last_name, email, niche, tier, status,
            creator_platforms ( platform, handle, followers )
          )
        `)
        .eq('campaign_id', id)

      setCampaignCreators(cc || [])
      setLoading(false)
    }
    load()
  }, [id, router])

  function openModal(cc: any) {
    setSelected(cc)
    setModalTab('deal')
    setDeal({
      status:           cc.status || 'added',
      initial_offer:    cc.initial_offer?.toString()   || '',
      counter_offer:    cc.counter_offer?.toString()   || '',
      agreed_fee:       cc.agreed_fee?.toString()      || '',
      deliverables:     cc.deliverables                || '',
      quantity:         cc.quantity?.toString()        || '',
      content_due_date: cc.content_due_date            || '',
      internal_notes:   cc.internal_notes              || '',
    })
    setProfile({
      first_name: cc.creators?.first_name || '',
      last_name:  cc.creators?.last_name  || '',
      email:      cc.creators?.email      || '',
      tier:       cc.creators?.tier       || 'micro',
    })
    setSaveMsg('')
  }

  async function saveDeal() {
    if (!selected) return
    setSaving(true); setSaveMsg('')
    const { error } = await supabase
      .from('campaign_creators')
      .update({
        status:           deal.status,
        initial_offer:    deal.initial_offer    ? parseFloat(deal.initial_offer)   : null,
        counter_offer:    deal.counter_offer    ? parseFloat(deal.counter_offer)   : null,
        agreed_fee:       deal.agreed_fee       ? parseFloat(deal.agreed_fee)      : null,
        deliverables:     deal.deliverables     || null,
        quantity:         deal.quantity         ? parseInt(deal.quantity)          : null,
        content_due_date: deal.content_due_date || null,
        internal_notes:   deal.internal_notes   || null,
      })
      .eq('id', selected.id)

    if (error) { setSaveMsg('Error: ' + error.message); setSaving(false); return }

    const updated = {
      ...selected, ...deal,
      initial_offer:   deal.initial_offer   ? parseFloat(deal.initial_offer)   : null,
      counter_offer:   deal.counter_offer   ? parseFloat(deal.counter_offer)   : null,
      agreed_fee:      deal.agreed_fee      ? parseFloat(deal.agreed_fee)      : null,
      quantity:        deal.quantity        ? parseInt(deal.quantity)          : null,
    }
    setCampaignCreators(p => p.map(c => c.id === selected.id ? updated : c))
    setSelected(updated)
    setSaveMsg('Saved ✓')
    setSaving(false)
  }

  async function saveProfile() {
    if (!selected) return
    setSaving(true); setSaveMsg('')
    const full_name = `${profile.first_name} ${profile.last_name}`.trim()
    const { error } = await supabase
      .from('creators')
      .update({
        first_name: profile.first_name,
        last_name:  profile.last_name || null,
        full_name,
        email:      profile.email || null,
        tier:       profile.tier,
      })
      .eq('id', selected.creators.id)

    if (error) { setSaveMsg('Error: ' + error.message); setSaving(false); return }

    const updatedCreator = { ...selected.creators, ...profile, full_name }
    const updated = { ...selected, creators: updatedCreator }
    setCampaignCreators(p => p.map(c => c.id === selected.id ? updated : c))
    setSelected(updated)
    setSaveMsg('Saved ✓')
    setSaving(false)
  }

  async function saveCampaign() {
    if (!campaignForm.campaign_name || !campaignForm.brand) {
      setEditError('Campaign name and brand are required'); return
    }
    setEditSaving(true); setEditError('')

    const payload = {
      campaign_name:      campaignForm.campaign_name,
      brand:              campaignForm.brand,
      product:            campaignForm.product            || null,
      platform:           campaignForm.platform,
      key_message:        campaignForm.key_message        || null,
      deliverables:       campaignForm.deliverables       || null,
      posting_from:       campaignForm.posting_from       || null,
      posting_to:         campaignForm.posting_to         || null,
      budget:             campaignForm.budget             ? parseFloat(campaignForm.budget)         : 0,
      exclusivity_days:   campaignForm.exclusivity_days   ? parseInt(campaignForm.exclusivity_days) : null,
      usage_months:       campaignForm.usage_months       ? parseInt(campaignForm.usage_months)     : null,
      content_guidelines: campaignForm.content_guidelines || null,
      status:             campaignForm.status,
      account_manager_id: campaignForm.account_manager_id || null,
    }

    const { error } = await supabase.from('campaigns').update(payload).eq('id', id)
    if (error) { setEditError(error.message); setEditSaving(false); return }

    setCampaign((prev: any) => ({ ...prev, ...payload }))
    setEditingCampaign(false)
    setEditSaving(false)
  }

  const totalBudget = campaign?.budget || 0
  const spent = campaignCreators
    .filter(cc => cc.status === 'signed' && cc.agreed_fee)
    .reduce((sum, cc) => sum + Number(cc.agreed_fee), 0)
  const remaining = totalBudget - spent
  const spentPct = totalBudget > 0 ? Math.min((spent / totalBudget) * 100, 100) : 0

  const signedCreators    = campaignCreators.filter(cc => cc.status === 'signed')
  const totalDeliverables = signedCreators.reduce((sum, cc) => sum + (cc.quantity || 0), 0)

  const stats = [
    { label: 'Total',         val: campaignCreators.length, color: '#e8e8f0' },
    { label: 'Signed',        val: campaignCreators.filter(c => c.status === 'signed').length, color: '#1D9E75' },
    { label: 'In progress',   val: campaignCreators.filter(c => ['replied','negotiating','contract_out'].includes(c.status)).length, color: '#f5a623' },
    { label: 'Outreach sent', val: campaignCreators.filter(c => c.status === 'outreach_sent').length, color: '#378ADD' },
    { label: 'Declined',      val: campaignCreators.filter(c => c.status === 'declined').length, color: '#5a5a70' },
  ]

  const inp = {
    width: '100%', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '6px', padding: '7px 10px', color: '#e8e8f0', fontSize: '12px',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'sans-serif',
  }
  const lbl = { display: 'block' as const, color: '#9090a8', fontSize: '11px', marginBottom: '4px', fontWeight: '500' as const }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9090a8', fontFamily: 'sans-serif' }}>
      Loading...
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <div style={{ background: '#16161a', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a898ff', marginRight: '8px' }}>creatorflow</span>
        <a href="/campaigns" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>← All campaigns</a>
        <span style={{ color: '#5a5a70', fontSize: '12px' }}>/</span>
        <span style={{ color: '#e8e8f0', fontSize: '12px' }}>{campaign?.campaign_name}</span>
        <div style={{ flex: 1 }} />
        <a href={`/creators/add?campaign=${id}`} style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(124,106,247,0.12)', color: '#a898ff', border: '1px solid rgba(124,106,247,0.3)', fontSize: '12px', textDecoration: 'none', fontWeight: '500' }}>
          + Add creator
        </a>
        <a href="/dashboard" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>Dashboard</a>
      </div>

      {/* STATS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px', padding: '12px 24px', flexShrink: 0 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#1e1e24', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '18px', fontWeight: '500', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '11px', color: '#5a5a70', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* PIPELINE COLUMNS */}
        <div style={{ flex: 1, overflowX: 'auto', padding: '0 24px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUSES.length}, minmax(160px, 1fr))`, gap: '10px', minWidth: '900px' }}>
            {STATUSES.map(status => {
              const cols = campaignCreators.filter(cc => cc.status === status.id)
              return (
                <div key={status.id}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#9090a8', padding: '5px 2px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                    {status.label}
                    <span style={{ fontSize: '10px', background: '#1e1e24', color: '#5a5a70', borderRadius: '10px', padding: '1px 6px' }}>{cols.length}</span>
                  </div>
                  {cols.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 8px', color: '#5a5a70', fontSize: '11px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>Empty</div>
                  )}
                  {cols.map((cc, i) => {
                    const creator = cc.creators
                    if (!creator) return null
                    const initials = creator.full_name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??'
                    const bg = AVATAR_COLORS[i % AVATAR_COLORS.length]
                    const primaryPlatform = creator.creator_platforms?.[0]
                    return (
                      <div key={cc.id} onClick={() => openModal(cc)}
                        style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', marginBottom: '6px', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '500', color: '#fff', flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '500', color: '#e8e8f0' }}>{creator.full_name}</div>
                            <div style={{ fontSize: '11px', color: '#5a5a70' }}>{primaryPlatform?.handle}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '5px' }}>
                          {primaryPlatform?.platform && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '6px', background: '#26262e', color: '#9090a8' }}>{primaryPlatform.platform}</span>}
                          {primaryPlatform?.followers && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '6px', background: '#26262e', color: '#9090a8' }}>{Number(primaryPlatform.followers).toLocaleString()}</span>}
                          {creator.tier && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '6px', background: '#26262e', color: '#9090a8' }}>{creator.tier}</span>}
                        </div>
                        {cc.agreed_fee && <div style={{ fontSize: '12px', fontWeight: '500', color: '#3ecf8e' }}>£{Number(cc.agreed_fee).toLocaleString()}</div>}
                        {cc.initial_offer && !cc.agreed_fee && <div style={{ fontSize: '12px', color: '#9090a8' }}>Offer: £{Number(cc.initial_offer).toLocaleString()}</div>}
                        {cc.content_due_date && <div style={{ fontSize: '10px', color: '#5a5a70', marginTop: '4px' }}>Due {cc.content_due_date}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* SIDEBAR TOGGLE */}
        <button onClick={() => setSidebarOpen(o => !o)}
          style={{ position: 'absolute', right: sidebarOpen ? '300px' : '0', top: '50%', transform: 'translateY(-50%)', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px 0 0 6px', padding: '10px 6px', cursor: 'pointer', color: '#5a5a70', fontSize: '12px', zIndex: 10, transition: 'right 0.25s' }}>
          {sidebarOpen ? '›' : '‹'}
        </button>

        {/* SIDEBAR */}
        {sidebarOpen && (
          <div style={{ width: '300px', flexShrink: 0, background: '#16161a', borderLeft: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: '20px' }}>

            {/* HEADER */}
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#e8e8f0', marginBottom: '4px' }}>
                    {campaign?.campaign_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9090a8' }}>
                    {campaign?.brand}{campaign?.product ? ` · ${campaign.product}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => { setEditingCampaign(e => !e); setEditError('') }}
                  title={editingCampaign ? 'Cancel edit' : 'Edit campaign'}
                  style={{ background: editingCampaign ? 'rgba(124,106,247,0.15)' : 'transparent', border: `1px solid ${editingCampaign ? 'rgba(124,106,247,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: editingCampaign ? '#a898ff' : '#5a5a70', fontSize: '13px', flexShrink: 0, lineHeight: 1 }}
                >
                  {editingCampaign ? '✕' : '✎'}
                </button>
              </div>
              {campaign?.status && !editingCampaign && (
                <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: 'rgba(62,207,142,0.1)', color: '#3ecf8e', border: '1px solid rgba(62,207,142,0.25)' }}>
                  {campaign.status}
                </span>
              )}
            </div>

            {/* EDIT FORM */}
            {editingCampaign ? (
              <div>
                <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Campaign details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                  <div>
                    <label style={lbl}>Campaign name *</label>
                    <input style={inp} value={campaignForm.campaign_name} onChange={e => setCampaignForm((f: any) => ({ ...f, campaign_name: e.target.value }))} placeholder="e.g. Spring Launch 2025" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={lbl}>Brand *</label>
                      <input style={inp} value={campaignForm.brand} onChange={e => setCampaignForm((f: any) => ({ ...f, brand: e.target.value }))} placeholder="Brand name" />
                    </div>
                    <div>
                      <label style={lbl}>Product</label>
                      <input style={inp} value={campaignForm.product} onChange={e => setCampaignForm((f: any) => ({ ...f, product: e.target.value }))} placeholder="Product / service" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={lbl}>Platform</label>
                      <select style={inp} value={campaignForm.platform} onChange={e => setCampaignForm((f: any) => ({ ...f, platform: e.target.value }))}>
                        {['Instagram','TikTok','YouTube','Instagram + TikTok','Multi-platform'].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Status</label>
                      <select style={inp} value={campaignForm.status} onChange={e => setCampaignForm((f: any) => ({ ...f, status: e.target.value }))}>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Account manager</label>
                    <select style={inp} value={campaignForm.account_manager_id} onChange={e => setCampaignForm((f: any) => ({ ...f, account_manager_id: e.target.value }))}>
                      <option value="">— Unassigned —</option>
                      {managers.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.full_name}{m.email ? ` (${m.email})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Key message</label>
                    <textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={campaignForm.key_message} onChange={e => setCampaignForm((f: any) => ({ ...f, key_message: e.target.value }))} placeholder="Core campaign message" />
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>Deliverables & timeline</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                  <div>
                    <label style={lbl}>Deliverables</label>
                    <input style={inp} value={campaignForm.deliverables} onChange={e => setCampaignForm((f: any) => ({ ...f, deliverables: e.target.value }))} placeholder="e.g. 2 Reels + 3 Stories" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={lbl}>Posting from</label>
                      <input style={inp} type="date" value={campaignForm.posting_from} onChange={e => setCampaignForm((f: any) => ({ ...f, posting_from: e.target.value }))} />
                    </div>
                    <div>
                      <label style={lbl}>Posting to</label>
                      <input style={inp} type="date" value={campaignForm.posting_to} onChange={e => setCampaignForm((f: any) => ({ ...f, posting_to: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>Budget & terms</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Total budget (£)</label>
                    <input style={inp} type="number" min="0" value={campaignForm.budget} onChange={e => setCampaignForm((f: any) => ({ ...f, budget: e.target.value }))} placeholder="e.g. 5000" />
                  </div>
                  <div>
                    <label style={lbl}>Exclusivity days</label>
                    <input style={inp} type="number" min="0" value={campaignForm.exclusivity_days} onChange={e => setCampaignForm((f: any) => ({ ...f, exclusivity_days: e.target.value }))} placeholder="e.g. 30" />
                  </div>
                  <div>
                    <label style={lbl}>Usage months</label>
                    <input style={inp} type="number" min="0" value={campaignForm.usage_months} onChange={e => setCampaignForm((f: any) => ({ ...f, usage_months: e.target.value }))} placeholder="e.g. 6" />
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>Content guidelines</div>
                <div style={{ marginBottom: '18px' }}>
                  <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={campaignForm.content_guidelines} onChange={e => setCampaignForm((f: any) => ({ ...f, content_guidelines: e.target.value }))} placeholder="No competitor mentions. Authentic lifestyle feel." />
                </div>

                {editError && (
                  <div style={{ background: 'rgba(240,96,96,0.1)', border: '1px solid rgba(240,96,96,0.2)', borderRadius: '6px', padding: '8px 12px', color: '#f06060', fontSize: '12px', marginBottom: '12px' }}>
                    {editError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={saveCampaign}
                    disabled={editSaving}
                    style={{ flex: 1, background: '#7c6af7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 0', fontSize: '12px', fontWeight: '500', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.6 : 1 }}
                  >
                    {editSaving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button
                    onClick={() => { setEditingCampaign(false); setEditError('') }}
                    style={{ background: '#1e1e24', color: '#9090a8', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

            ) : (
              <>
                {/* BUDGET */}
                <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Budget</div>
                  {[
                    { k: 'Total',     v: `£${Number(totalBudget).toLocaleString()}`, c: '#e8e8f0' },
                    { k: 'Committed', v: `£${Number(spent).toLocaleString()}`,       c: '#3ecf8e' },
                    { k: 'Remaining', v: `£${Number(remaining).toLocaleString()}`,   c: remaining < 0 ? '#f06060' : '#e8e8f0' },
                  ].map(r => (
                    <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#9090a8' }}>{r.k}</span>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: r.c }}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{ background: '#26262e', borderRadius: '4px', height: '6px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ height: '100%', width: `${spentPct}%`, background: spentPct > 90 ? '#f06060' : '#3ecf8e', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#5a5a70', marginTop: '4px', textAlign: 'right' }}>{Math.round(spentPct)}% committed</div>

                  {signedCreators.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#9090a8' }}>Deliverables</span>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#e8e8f0' }}>{totalDeliverables}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#9090a8' }}>Signed creators</span>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#3ecf8e' }}>{signedCreators.length}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* DETAILS */}
                <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Details</div>
                  {[
                    { k: 'Platform',     v: campaign?.platform },
                    { k: 'Deliverables', v: campaign?.deliverables },
                    { k: 'Live from',    v: campaign?.posting_from },
                    { k: 'Live to',      v: campaign?.posting_to },
                    { k: 'Exclusivity',  v: campaign?.exclusivity_days ? `${campaign.exclusivity_days} days` : null },
                    { k: 'Usage',        v: campaign?.usage_months ? `${campaign.usage_months} months` : null },
                  ].filter(r => r.v).map(row => (
                    <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                      <span style={{ color: '#9090a8' }}>{row.k}</span>
                      <span style={{ color: '#e8e8f0', fontWeight: '500', textAlign: 'right', maxWidth: '160px' }}>{row.v}</span>
                    </div>
                  ))}
                </div>

                {/* ACCOUNT MANAGER */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Account manager</div>
                  {campaign?.profiles ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(124,106,247,0.2)', border: '1px solid rgba(124,106,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', color: '#a898ff', flexShrink: 0 }}>
                        {campaign.profiles.full_name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e8f0' }}>{campaign.profiles.full_name}</div>
                        {campaign.profiles.email && <div style={{ fontSize: '11px', color: '#9090a8' }}>{campaign.profiles.email}</div>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#5a5a70' }}>No manager assigned</div>
                  )}
                </div>

                {/* KEY MESSAGE */}
                {campaign?.key_message && (
                  <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Key message</div>
                    <div style={{ fontSize: '12px', color: '#9090a8', lineHeight: '1.5' }}>{campaign.key_message}</div>
                  </div>
                )}

                {/* GUIDELINES */}
                {campaign?.content_guidelines && (
                  <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Guidelines</div>
                    <div style={{ fontSize: '12px', color: '#9090a8', lineHeight: '1.5' }}>{campaign.content_guidelines}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* CREATOR MODAL */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#7c6af7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', color: '#fff', flexShrink: 0 }}>
                {selected.creators?.full_name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e8f0' }}>{selected.creators?.full_name}</div>
                <div style={{ fontSize: '12px', color: '#9090a8' }}>
                  {selected.creators?.creator_platforms?.[0]?.handle} · {selected.creators?.creator_platforms?.[0]?.platform}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#5a5a70', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              {(['deal', 'profile'] as const).map(tab => (
                <button key={tab} onClick={() => { setModalTab(tab); setSaveMsg('') }}
                  style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: `2px solid ${modalTab === tab ? '#7c6af7' : 'transparent'}`, color: modalTab === tab ? '#e8e8f0' : '#5a5a70', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                  {tab === 'deal' ? 'Deal info' : 'Creator profile'}
                </button>
              ))}
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', padding: '16px 18px', flex: 1 }}>

              {modalTab === 'deal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Pipeline status</label>
                    <select style={inp} value={deal.status} onChange={e => setDeal(d => ({ ...d, status: e.target.value }))}>
                      {STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={lbl}>Initial offer (£)</label>
                      <input style={inp} type="number" min="0" value={deal.initial_offer} onChange={e => setDeal(d => ({ ...d, initial_offer: e.target.value }))} placeholder="e.g. 1000" />
                    </div>
                    <div>
                      <label style={lbl}>Counter offer (£)</label>
                      <input style={inp} type="number" min="0" value={deal.counter_offer} onChange={e => setDeal(d => ({ ...d, counter_offer: e.target.value }))} placeholder="e.g. 1500" />
                    </div>
                    <div>
                      <label style={lbl}>Agreed fee (£)</label>
                      <input style={inp} type="number" min="0" value={deal.agreed_fee} onChange={e => setDeal(d => ({ ...d, agreed_fee: e.target.value }))} placeholder="e.g. 1200" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
                    <div>
                      <label style={lbl}>Deliverables</label>
                      <input style={inp} value={deal.deliverables} onChange={e => setDeal(d => ({ ...d, deliverables: e.target.value }))} placeholder="e.g. 2 Reels + 1 Story" />
                    </div>
                    <div style={{ width: '64px' }}>
                      <label style={lbl}>Qty</label>
                      <input style={inp} type="number" min="0" value={deal.quantity} onChange={e => setDeal(d => ({ ...d, quantity: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Content due date</label>
                    <input style={inp} type="date" value={deal.content_due_date} onChange={e => setDeal(d => ({ ...d, content_due_date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Internal notes</label>
                    <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={deal.internal_notes} onChange={e => setDeal(d => ({ ...d, internal_notes: e.target.value }))} placeholder="e.g. Warm lead, met at LFW" />
                  </div>
                </div>
              )}

              {modalTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={lbl}>First name</label>
                      <input style={inp} value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                    </div>
                    <div>
                      <label style={lbl}>Last name</label>
                      <input style={inp} value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Email</label>
                    <input style={inp} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="e.g. creator@email.com" />
                  </div>
                  <div>
                    <label style={lbl}>Tier</label>
                    <select style={inp} value={profile.tier} onChange={e => setProfile(p => ({ ...p, tier: e.target.value }))}>
                      {TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  {selected.creators?.creator_platforms?.length > 0 && (
                    <div>
                      <label style={lbl}>Platforms</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selected.creators.creator_platforms.map((pl: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 10px', background: '#1e1e24', borderRadius: '6px', fontSize: '12px' }}>
                            <span style={{ color: '#9090a8', minWidth: '70px' }}>{pl.platform}</span>
                            <span style={{ color: '#e8e8f0' }}>{pl.handle}</span>
                            {pl.followers && <span style={{ color: '#5a5a70', marginLeft: 'auto' }}>{Number(pl.followers).toLocaleString()}</span>}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: '#5a5a70', marginTop: '6px' }}>Platform editing coming soon.</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {saveMsg && (
                <span style={{ fontSize: '12px', color: saveMsg.startsWith('Error') ? '#f06060' : '#3ecf8e' }}>{saveMsg}</span>
              )}
              <div style={{ flex: 1 }} />
              <a href={`/outreach/${selected.creators?.id}?campaign=${id}`}
                style={{ background: 'rgba(124,106,247,0.12)', color: '#a898ff', border: '1px solid rgba(124,106,247,0.3)', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', textDecoration: 'none', fontWeight: '500' }}>
                Deal flow
              </a>
              <button onClick={modalTab === 'deal' ? saveDeal : saveProfile} disabled={saving}
                style={{ background: '#7c6af7', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 18px', fontSize: '12px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setSelected(null)}
                style={{ background: '#1e1e24', color: '#9090a8', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
