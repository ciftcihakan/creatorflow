'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewCampaign() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    brand: '', product: '', objective: 'launch', platform: 'Instagram',
    message: '', deliverables: '', date_from: '', date_to: '',
    budget_min: '', budget_max: '', payment: '50% on signing, 50% on delivery',
    excl_days: '', excl_cat: '', usage_months: '', usage_channels: '',
    agency_name: '', tone: 'warm', guidelines: '', hashtags: '',
  })

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return; }
      setUser(user)
      setForm(f => ({ ...f, agency_name: user.user_metadata?.agency_name || '' }))
    }
    getUser()
  }, [router])

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.brand || !form.deliverables || !form.date_from || !form.budget_min) {
      setError('Please fill in all required fields'); return;
    }
    setLoading(true); setError('')
    const { error } = await supabase.from('campaigns').insert({
      ...form, agency_id: user.id, status: 'active'
    })
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard')
  }

  const input = {
    width: '100%', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px', padding: '9px 12px', color: '#e8e8f0', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'sans-serif',
  }
  const label = { display: 'block' as const, color: '#9090a8', fontSize: '12px', marginBottom: '5px', fontWeight: '500' as const }
  const section = { marginBottom: '28px' }
  const sectionTitle = { fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }
  const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#16161a', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a898ff' }}>creatorflow</div>
        <a href="/dashboard" style={{ color: '#9090a8', fontSize: '12px', textDecoration: 'none' }}>← Dashboard</a>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '36px 24px 80px' }}>
        <h1 style={{ color: '#e8e8f0', fontSize: '22px', fontWeight: '500', marginBottom: '6px' }}>New campaign brief</h1>
        <p style={{ color: '#9090a8', fontSize: '13px', marginBottom: '32px' }}>Fill in the details below — this brief feeds into every AI feature.</p>

        <form onSubmit={handleSubmit}>
          <div style={section}>
            <div style={sectionTitle}>Brand & campaign</div>
            <div style={grid}>
              <div><label style={label}>Brand name *</label><input style={input} value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="e.g. Lumière Skincare" /></div>
              <div><label style={label}>Product / service</label><input style={input} value={form.product} onChange={e => update('product', e.target.value)} placeholder="e.g. Spring serum range" /></div>
              <div>
                <label style={label}>Objective</label>
                <select style={input} value={form.objective} onChange={e => update('objective', e.target.value)}>
                  <option value="launch">Product launch</option>
                  <option value="awareness">Brand awareness</option>
                  <option value="conversion">Drive conversions</option>
                  <option value="ugc">UGC / content</option>
                </select>
              </div>
              <div>
                <label style={label}>Platform</label>
                <select style={input} value={form.platform} onChange={e => update('platform', e.target.value)}>
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>YouTube</option>
                  <option>Instagram + TikTok</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Key message</label>
                <textarea style={{ ...input, minHeight: '70px', resize: 'vertical' }} value={form.message} onChange={e => update('message', e.target.value)} placeholder="e.g. Spring is for fresh starts — our SPF serum makes your morning routine effortless." />
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Deliverables & timeline</div>
            <div style={grid}>
              <div><label style={label}>Deliverables *</label><input style={input} value={form.deliverables} onChange={e => update('deliverables', e.target.value)} placeholder="e.g. 2 Reels + 3 Stories" /></div>
              <div><label style={label}>Posting from *</label><input style={input} value={form.date_from} onChange={e => update('date_from', e.target.value)} placeholder="e.g. 18 May" /></div>
              <div><label style={label}>Posting to</label><input style={input} value={form.date_to} onChange={e => update('date_to', e.target.value)} placeholder="e.g. 30 May 2025" /></div>
              <div><label style={label}>Required hashtags</label><input style={input} value={form.hashtags} onChange={e => update('hashtags', e.target.value)} placeholder="e.g. #brand @handle" /></div>
            </div>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Budget & terms</div>
            <div style={grid}>
              <div><label style={label}>Budget min *</label><input style={input} value={form.budget_min} onChange={e => update('budget_min', e.target.value)} placeholder="e.g. £1,200" /></div>
              <div><label style={label}>Budget max</label><input style={input} value={form.budget_max} onChange={e => update('budget_max', e.target.value)} placeholder="e.g. £1,800" /></div>
              <div>
                <label style={label}>Payment schedule</label>
                <select style={input} value={form.payment} onChange={e => update('payment', e.target.value)}>
                  <option>50% on signing, 50% on delivery</option>
                  <option>100% on delivery</option>
                  <option>100% on signing</option>
                </select>
              </div>
              <div><label style={label}>Exclusivity days</label><input style={input} value={form.excl_days} onChange={e => update('excl_days', e.target.value)} placeholder="e.g. 30" /></div>
              <div><label style={label}>Exclusivity category</label><input style={input} value={form.excl_cat} onChange={e => update('excl_cat', e.target.value)} placeholder="e.g. skincare" /></div>
              <div><label style={label}>Usage months</label><input style={input} value={form.usage_months} onChange={e => update('usage_months', e.target.value)} placeholder="e.g. 6" /></div>
              <div><label style={label}>Usage channels</label><input style={input} value={form.usage_channels} onChange={e => update('usage_channels', e.target.value)} placeholder="e.g. digital" /></div>
            </div>
          </div>

          <div style={section}>
            <div style={sectionTitle}>Agency settings</div>
            <div style={grid}>
              <div><label style={label}>Agency name</label><input style={input} value={form.agency_name} onChange={e => update('agency_name', e.target.value)} placeholder="e.g. Lumiere Agency" /></div>
              <div>
                <label style={label}>Outreach tone</label>
                <select style={input} value={form.tone} onChange={e => update('tone', e.target.value)}>
                  <option value="warm">Warm & professional</option>
                  <option value="casual">Casual & direct</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Content guidelines</label>
                <textarea style={{ ...input, minHeight: '70px', resize: 'vertical' }} value={form.guidelines} onChange={e => update('guidelines', e.target.value)} placeholder="e.g. No competitor mentions. Show product on skin. Authentic lifestyle feel." />
              </div>
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