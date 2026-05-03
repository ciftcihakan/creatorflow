'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AddCreator() {
  const [user, setUser] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    name: '', handle: '', platform: 'Instagram',
    followers: '', engagement: '', niche: '',
    rate: '', auth_score: '', campaign_id: '',
    assignee: '', notes: '', status: 'outreach',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const { data: camps } = await supabase.from('campaigns').select('*').eq('agency_id', user.id)
      setCampaigns(camps || [])
      if (camps && camps.length > 0) setForm(f => ({ ...f, campaign_id: camps[0].id }))
    }
    load()
  }, [router])

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.handle) { setError('Name and handle are required'); return }
    setLoading(true); setError('')
    const { error } = await supabase.from('creators').insert({
      ...form,
      agency_id: user.id,
      last_activity: 'Just added',
      days_overdue: 0,
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/pipeline')
  }

  const inp = { width:'100%', background:'#1e1e24', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'9px 12px', color:'#e8e8f0', fontSize:'13px', outline:'none', boxSizing:'border-box' as const, fontFamily:'sans-serif' }
  const lbl = { display:'block' as const, color:'#9090a8', fontSize:'12px', marginBottom:'5px', fontWeight:'500' as const }
  const grid = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }

  return (
    <main style={{minHeight:'100vh',background:'#0f0f11',fontFamily:'sans-serif'}}>
      <div style={{background:'#16161a',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'14px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:'monospace',fontSize:'13px',color:'#a898ff'}}>creatorflow</div>
        <a href="/pipeline" style={{color:'#9090a8',fontSize:'12px',textDecoration:'none'}}>← Pipeline</a>
      </div>

      <div style={{maxWidth:'640px',margin:'0 auto',padding:'36px 24px 80px'}}>
        <h1 style={{color:'#e8e8f0',fontSize:'22px',fontWeight:'500',marginBottom:'6px'}}>Add creator</h1>
        <p style={{color:'#9090a8',fontSize:'13px',marginBottom:'32px'}}>Add a creator to your pipeline manually.</p>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'24px'}}>
            <div style={{fontSize:'11px',color:'#5a5a70',textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:'14px',paddingBottom:'8px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>Creator details</div>
            <div style={grid}>
              <div><label style={lbl}>Full name *</label><input style={inp} value={form.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. Sophie Laurent" /></div>
              <div><label style={lbl}>Handle *</label><input style={inp} value={form.handle} onChange={e=>update('handle',e.target.value)} placeholder="e.g. @sophielaurent" /></div>
              <div>
                <label style={lbl}>Platform</label>
                <select style={inp} value={form.platform} onChange={e=>update('platform',e.target.value)}>
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>YouTube</option>
                </select>
              </div>
              <div><label style={lbl}>Niche</label><input style={inp} value={form.niche} onChange={e=>update('niche',e.target.value)} placeholder="e.g. Fashion" /></div>
              <div><label style={lbl}>Followers</label><input style={inp} value={form.followers} onChange={e=>update('followers',e.target.value)} placeholder="e.g. 142K" /></div>
              <div><label style={lbl}>Engagement rate</label><input style={inp} value={form.engagement} onChange={e=>update('engagement',e.target.value)} placeholder="e.g. 4.8%" /></div>
              <div><label style={lbl}>Rate / estimate</label><input style={inp} value={form.rate} onChange={e=>update('rate',e.target.value)} placeholder="e.g. £1,200 or Est. £900–£1,400" /></div>
              <div><label style={lbl}>Auth score</label><input style={inp} value={form.auth_score} onChange={e=>update('auth_score',e.target.value)} placeholder="e.g. 82/100" /></div>
            </div>
          </div>

          <div style={{marginBottom:'24px'}}>
            <div style={{fontSize:'11px',color:'#5a5a70',textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:'14px',paddingBottom:'8px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>Campaign & assignment</div>
            <div style={grid}>
              <div>
                <label style={lbl}>Campaign</label>
                <select style={inp} value={form.campaign_id} onChange={e=>update('campaign_id',e.target.value)}>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.brand} — {c.product||'Campaign'}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Pipeline status</label>
                <select style={inp} value={form.status} onChange={e=>update('status',e.target.value)}>
                  <option value="outreach">Outreach sent</option>
                  <option value="replied">Replied</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="contract">Contract out</option>
                  <option value="signed">Signed</option>
                  <option value="declined">Declined</option>
                  <option value="cold">Gone cold</option>
                </select>
              </div>
              <div><label style={lbl}>Assigned to</label><input style={inp} value={form.assignee} onChange={e=>update('assignee',e.target.value)} placeholder="e.g. Jamie" /></div>
              <div><label style={lbl}>Notes</label><input style={inp} value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="e.g. Met at LFW — warm lead" /></div>
            </div>
          </div>

          {error && <div style={{background:'rgba(240,96,96,0.1)',border:'1px solid rgba(240,96,96,0.25)',borderRadius:'8px',padding:'10px 14px',color:'#f06060',fontSize:'12px',marginBottom:'16px'}}>{error}</div>}

          <button type="submit" disabled={loading} style={{background:'#7c6af7',color:'#fff',border:'none',borderRadius:'8px',padding:'11px 24px',fontSize:'14px',fontWeight:'500',cursor:loading?'not-allowed':'pointer',opacity:loading?0.6:1}}>
            {loading ? 'Adding...' : 'Add to pipeline'}
          </button>
        </form>
      </div>
    </main>
  )
}