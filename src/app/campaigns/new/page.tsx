'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewCampaign() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [managers, setManagers] = useState<any[]>([])
  const router = useRouter()

  const [form, setForm] = useState({
    campaign_name: '',
    brand: '',
    product: '',
    platform: 'Instagram',
    key_message: '',
    deliverables: '',
    posting_from: '',
    posting_to: '',
    budget: '',
    exclusivity_days: '',
    usage_months: '',
    content_guidelines: '',
    status: 'draft',
    account_manager_id: '',
  })

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const { data: mgrs } = await supabase.from('profiles').select('id, full_name, email')
      setManagers(mgrs || [])
    }
    getUser()
  }, [router])

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.campaign_name || !form.brand || !form.deliverables || !form.posting_from) {
      setError('Please fill in all required fields'); return
    }
    setLoading(true); setError('')

    const payload: any = {
      agency_id: user.id,
      campaign_name: form.campaign_name,
      brand: form.brand,
      product: form.product || null,
      platform: form.platform,
      key_message: form.key_message || null,
      deliverables: form.deliverables,
      posting_from: form.posting_from,
      posting_to: form.posting_to || null,
      budget: form.budget ? parseFloat(form.budget) : 0,
      exclusivity_days: form.exclusivity_days ? parseInt(form.exclusivity_days) : null,
      usage_months: form.usage_months ? parseInt(form.usage_months) : null,
      content_guidelines: form.content_guidelines || null,
      status: form.status,
      account_manager_id: form.account_manager_id || null,
    }

    const { error } = await supabase.from('campaigns').insert(payload)
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/campaigns')
  }

  const input = {
    width: '100%',
    background: '#1e1e24',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    padding: '9px 12px',
    color: '#e8e8f0',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'sans-serif',
  }
  const label = {
    display: 'block' as const,
    color: '#9090a8',
    fontSize: '12px',
    marginBottom: '5px',
    fontWeight: '500' as const,
  }
  const section = { marginBottom: '28px' }
  const sectionTitle = {
    fontSize: '11px',
    color: '#5a5a70',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    marginBottom: '14px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  }
  const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#16161a', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a898ff' }}>creatorflow</div>
        <a href="/campaigns" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>← Campaigns</a>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '36px 24px 80px' }}>
        <h1 style={{ color: '#e8e8f0', fontSize: '22px', fontWeight: '500', marginBottom: '6px' }}>New campaign brief</h1>
        <p style={{ color: '#9090a8', fontSize: '13px', marginBottom: '32px' }}>Fill in the details below — this brief feeds into every AI feature.</p>

        <form onSubmit={handleSubmit}>

          {/* CAMPAIGN DETAILS */}
          <div style={section}>
            <div style={sectionTitle}>Campaign details</div>
            <div style={grid}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Campaign name *</label>
                <input style={input} value={form.campaign_name} onChange={e => update('campaign_name', e.target.value)} placeholder="e.g. Spring Launch 2025" />
              </div>
              <div>
                <label style={label}>Brand name *</label>
                <input style={input} value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="e.g. Lumière Skincare" />
              </div>
              <div>
                <label style={label}>Product / service</label>
                <input style={input} value={form.product} onChange={e => update('product', e.target.value)} placeholder="e.g. Spring serum range" />
              </div>
              <div>
                <label style={label}>Platform</label>
                <select style={input} value={form.platform} onChange={e => update('platform', e.target.value)}>
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>YouTube</option>
                  <option>Instagram + TikTok</option>
                  <option>Multi-platform</option>
                </select>
              </div>
              <div>
                <label style={label}>Status</label>
                <select style={input} value={form.status} onChange={e => update('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Account manager</label>
                <select style={input} value={form.account_manager_id} onChange={e => update('account_manager_id', e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} {m.email ? `(${m.email})` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Key message</label>
                <textarea style={{ ...input, minHeight: '70px', resize: 'vertical' }} value={form.key_message} onChange={e => update('key_message', e.target.value)} placeholder="e.g. Spring is for fresh starts — our SPF serum makes your morning routine effortless." />
              </div>
            </div>
          </div>

          {/* DELIVERABLES & TIMELINE */}
          <div style={section}>
            <div style={sectionTitle}>Deliverables & timeline</div>
            <div style={grid}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Deliverables *</label>
                <input style={input} value={form.deliverables} onChange={e => update('deliverables', e.target.value)} placeholder="e.g. 2 Reels + 3 Stories" />
              </div>
              <div>
                <label style={label}>Posting from *</label>
                <input style={input} type="date" value={form.posting_from} onChange={e => update('posting_from', e.target.value)} />
              </div>
              <div>
                <label style={label}>Posting to</label>
                <input style={input} type="date" value={form.posting_to} onChange={e => update('posting_to', e.target.value)} />
              </div>
            </div>
          </div>

          {/* BUDGET & TERMS */}
          <div style={section}>
            <div style={sectionTitle}>Budget & terms</div>
            <div style={grid}>
              <div>
                <label style={label}>Total budget (£)</label>
                <input style={input} type="number" min="0" value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="e.g. 5000" />
              </div>
              <div>
                <label style={label}>Exclusivity days</label>
                <input style={input} type="number" min="0" value={form.exclusivity_days} onChange={e => update('exclusivity_days', e.target.value)} placeholder="e.g. 30" />
              </div>
              <div>
                <label style={label}>Usage months</label>
                <input style={input} type="number" min="0" value={form.usage_months} onChange={e => update('usage_months', e.target.value)} placeholder="e.g. 6" />
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div style={section}>
            <div style={sectionTitle}>Content guidelines</div>
            <div>
              <label style={label}>Guidelines</label>
              <textarea style={{ ...input, minHeight: '90px', resize: 'vertical' }} value={form.content_guidelines} onChange={e => update('content_guidelines', e.target.value)} placeholder="e.g. No competitor mentions. Show product on skin. Authentic lifestyle feel." />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(240,96,96,0.1)', border: '1px solid rgba(240,96,96,0.25)', borderRadius: '8px', padding: '10px 14px', color: '#f06060', fontSize: '12px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ background: '#7c6af7', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Saving...' : 'Create campaign →'}
          </button>
        </form>
      </div>
    </main>
  )
}
