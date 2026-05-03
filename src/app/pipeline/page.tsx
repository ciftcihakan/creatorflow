'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUSES = [
  { id: 'outreach', label: 'Outreach sent', color: '#378ADD' },
  { id: 'replied', label: 'Replied', color: '#7F77DD' },
  { id: 'negotiating', label: 'Negotiating', color: '#EF9F27' },
  { id: 'contract', label: 'Contract out', color: '#D85A30' },
  { id: 'signed', label: 'Signed', color: '#1D9E75' },
  { id: 'declined', label: 'Declined', color: '#888780' },
  { id: 'cold', label: 'Gone cold', color: '#5a5a70' },
]

const COLORS = ['#7c6af7','#3ecf8e','#f5a623','#f06060','#378ADD','#EF9F27','#1D9E75']

export default function Pipeline() {
  const [creators, setCreators] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [campaign, setCampaign] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: camps } = await supabase.from('campaigns').select('*').eq('agency_id', user.id)
      setCampaigns(camps || [])
      const { data: crts } = await supabase.from('creators').select('*').eq('agency_id', user.id)
      setCreators(crts || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function moveStatus(id: string, status: string) {
    await supabase.from('creators').update({ status }).eq('id', id)
    setCreators(p => p.map(c => c.id === id ? { ...c, status } : c))
    setSelected((p: any) => p?.id === id ? { ...p, status } : p)
  }

  const list = campaign === 'all' ? creators : creators.filter(c => c.campaign_id === campaign)

  if (loading) return (
    <main style={{minHeight:'100vh',background:'#0f0f11',display:'flex',alignItems:'center',justifyContent:'center',color:'#9090a8',fontFamily:'sans-serif'}}>
      Loading...
    </main>
  )

  return (
    <main style={{minHeight:'100vh',background:'#0f0f11',fontFamily:'sans-serif'}}>
      <div style={{background:'#16161a',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'14px 24px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
        <span style={{fontFamily:'monospace',fontSize:'13px',color:'#a898ff',marginRight:'8px'}}>creatorflow</span>
        <button onClick={() => setCampaign('all')} style={{padding:'4px 12px',borderRadius:'20px',fontSize:'12px',border:'1px solid',borderColor:campaign==='all'?'rgba(124,106,247,0.3)':'rgba(255,255,255,0.07)',background:campaign==='all'?'rgba(124,106,247,0.12)':'transparent',color:campaign==='all'?'#a898ff':'#9090a8',cursor:'pointer'}}>
          All campaigns
        </button>
        {campaigns.map(c => (
          <button key={c.id} onClick={() => setCampaign(c.id)} style={{padding:'4px 12px',borderRadius:'20px',fontSize:'12px',border:'1px solid',borderColor:campaign===c.id?'rgba(124,106,247,0.3)':'rgba(255,255,255,0.07)',background:campaign===c.id?'rgba(124,106,247,0.12)':'transparent',color:campaign===c.id?'#a898ff':'#9090a8',cursor:'pointer'}}>
            {c.brand}
          </button>
        ))}
        <div style={{flex:1}} />
        <a href="/creators/add" style={{padding:'5px 12px',borderRadius:'6px',background:'rgba(124,106,247,0.12)',color:'#a898ff',border:'1px solid rgba(124,106,247,0.3)',fontSize:'12px',textDecoration:'none',fontWeight:'500'}}>+ Add creator</a>
        <a href="/dashboard" style={{color:'#9090a8',fontSize:'12px',textDecoration:'none'}}>Dashboard</a>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:'8px',padding:'12px 24px'}}>
        {[
          {l:'Total',v:list.length,c:'#e8e8f0'},
          {l:'Signed',v:list.filter(c=>c.status==='signed').length,c:'#3ecf8e'},
          {l:'In progress',v:list.filter(c=>['replied','negotiating','contract'].includes(c.status)).length,c:'#f5a623'},
          {l:'Outreach sent',v:list.filter(c=>c.status==='outreach').length,c:'#378ADD'},
          {l:'Declined',v:list.filter(c=>c.status==='declined').length,c:'#5a5a70'},
        ].map(s => (
          <div key={s.l} style={{background:'#1e1e24',borderRadius:'6px',padding:'10px 12px'}}>
            <div style={{fontSize:'18px',fontWeight:'500',color:s.c}}>{s.v}</div>
            <div style={{fontSize:'11px',color:'#5a5a70',marginTop:'2px'}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{padding:'0 24px 24px',overflowX:'auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(160px,1fr))',gap:'10px',minWidth:'900px'}}>
          {STATUSES.map(status => {
            const cols = list.filter(c => c.status === status.id)
            return (
              <div key={status.id}>
                <div style={{fontSize:'11px',fontWeight:'500',color:'#9090a8',padding:'5px 2px',display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:status.color,flexShrink:0}} />
                  {status.label}
                  <span style={{fontSize:'10px',background:'#1e1e24',color:'#5a5a70',borderRadius:'10px',padding:'1px 6px'}}>{cols.length}</span>
                </div>
                {cols.length === 0 && (
                  <div style={{textAlign:'center',padding:'20px 8px',color:'#5a5a70',fontSize:'11px',border:'1px dashed rgba(255,255,255,0.05)',borderRadius:'8px'}}>Empty</div>
                )}
                {cols.map((c, i) => {
                  const initials = c.name.split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)
                  const bg = COLORS[i % COLORS.length]
                  const overdue = (c.days_overdue||0) >= 5
                  const dueSoon = (c.days_overdue||0) >= 2
                  return (
                    <div key={c.id} onClick={() => setSelected(c)} style={{background:'#16161a',border:`1px solid ${overdue?'rgba(240,96,96,0.4)':'rgba(255,255,255,0.07)'}`,borderLeft:overdue?'2px solid #f06060':dueSoon?'2px solid #f5a623':'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'10px 12px',cursor:'pointer',marginBottom:'6px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                        <div style={{width:'28px',height:'28px',borderRadius:'50%',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'500',color:'#fff',flexShrink:0}}>{initials}</div>
                        <div>
                          <div style={{fontSize:'12px',fontWeight:'500',color:'#e8e8f0'}}>{c.name}</div>
                          <div style={{fontSize:'11px',color:'#5a5a70'}}>{c.handle}</div>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'5px'}}>
                        {c.platform&&<span style={{fontSize:'10px',padding:'2px 5px',borderRadius:'6px',background:'#26262e',color:'#9090a8'}}>{c.platform}</span>}
                        {c.followers&&<span style={{fontSize:'10px',padding:'2px 5px',borderRadius:'6px',background:'#26262e',color:'#9090a8'}}>{c.followers}</span>}
                        {c.niche&&<span style={{fontSize:'10px',padding:'2px 5px',borderRadius:'6px',background:'#26262e',color:'#9090a8'}}>{c.niche}</span>}
                      </div>
                      {c.rate&&<div style={{fontSize:'12px',fontWeight:'500',color:'#e8e8f0',marginBottom:'4px'}}>{c.rate}</div>}
                      {c.next_action&&<div style={{fontSize:'10px',padding:'2px 6px',borderRadius:'6px',background:'rgba(245,166,35,0.1)',color:'#f5a623',display:'inline-block',marginBottom:'4px'}}>{c.next_action}</div>}
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:'11px',color:overdue?'#f06060':dueSoon?'#f5a623':'#5a5a70'}}>{overdue?`${c.days_overdue}d overdue`:c.last_activity||'Just added'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:'20px'}}>
          <div style={{background:'#16161a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',width:'100%',maxWidth:'440px',overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:'10px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#7c6af7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'500',color:'#fff'}}>
                {selected.name.split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)}
              </div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'500',color:'#e8e8f0'}}>{selected.name}</div>
                <div style={{fontSize:'12px',color:'#9090a8'}}>{selected.handle} · {selected.platform}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{marginLeft:'auto',background:'none',border:'none',color:'#5a5a70',fontSize:'18px',cursor:'pointer'}}>x</button>
            </div>
            <div style={{padding:'16px 18px'}}>
              {[{k:'Rate',v:selected.rate},{k:'Followers',v:selected.followers},{k:'Engagement',v:selected.engagement},{k:'Niche',v:selected.niche},{k:'Last activity',v:selected.last_activity}].filter(r=>r.v).map(row=>(
                <div key={row.k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'12px'}}>
                  <span style={{color:'#9090a8'}}>{row.k}</span>
                  <span style={{color:'#e8e8f0',fontWeight:'500'}}>{row.v}</span>
                </div>
              ))}
              <div style={{marginTop:'14px',marginBottom:'6px'}}>
                <div style={{fontSize:'10px',color:'#5a5a70',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>Move to</div>
                <select value={selected.status} onChange={e=>moveStatus(selected.id,e.target.value)} style={{width:'100%',background:'#1e1e24',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'6px',padding:'8px 10px',color:'#e8e8f0',fontSize:'13px',cursor:'pointer'}}>
                  {STATUSES.map(st=><option key={st.id} value={st.id}>{st.label}</option>)}
                </select>
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'14px'}}>
                <a href={`/outreach/${selected.id}`} style={{flex:1,background:'rgba(124,106,247,0.12)',color:'#a898ff',border:'1px solid rgba(124,106,247,0.3)',borderRadius:'6px',padding:'8px',fontSize:'12px',textDecoration:'none',textAlign:'center',fontWeight:'500'}}>
                  Open deal flow
                </a>
                <button onClick={()=>setSelected(null)} style={{flex:1,background:'#1e1e24',color:'#9090a8',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'6px',padding:'8px',fontSize:'12px',cursor:'pointer'}}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}