'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STEPS = [
  { title: 'Initial outreach email', sub: 'AI drafts a personalised email from the campaign brief and creator profile', who: ['AI', 'Agency'], ai: true },
  { title: 'Creator reply received', sub: 'AI classifies intent and extracts proposed terms', who: ['Creator', 'AI'], ai: true },
  { title: 'Internal rate review', sub: 'AI surfaces benchmarks and deal summary for sign-off', who: ['Agency', 'AI'], ai: true },
  { title: 'Counter-offer drafted', sub: 'AI drafts counter-offer based on approved terms', who: ['AI', 'Agency'], ai: true },
  { title: 'Terms agreed', sub: 'Both sides confirmed — terms are locked', who: ['Agency', 'Creator'], ai: false },
  { title: 'Contract generated', sub: 'AI populates contract from the locked deal summary', who: ['AI'], ai: true },
  { title: 'Internal contract review', sub: 'Agency reviews and approves before sending', who: ['Agency'], ai: false },
  { title: 'Sent for e-signature', sub: 'Creator receives signing link', who: ['Agency', 'Creator'], ai: false },
  { title: 'Signed — campaign unlocked', sub: 'Contract signed, campaign setup triggered', who: ['AI', 'Agency'], ai: true },
]

export default function OutreachFlow() {
  const [creator, setCreator] = useState<any>(null)
  const [campaign, setCampaign] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [ai, setAi] = useState<any>({})
  const [tone, setTone] = useState('warm')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [approved, setApproved] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: cr } = await supabase.from('creators').select('*').eq('id', params.id).single()
      if (!cr) { router.push('/pipeline'); return }
      setCreator(cr)
      if (cr.campaign_id) {
        const { data: camp } = await supabase.from('campaigns').select('*').eq('id', cr.campaign_id).single()
        setCampaign(camp)
        if (camp?.tone) setTone(camp.tone)
      }
      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function callClaude(prompt: string, maxTokens = 600) {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens }),
    })
    const data = await res.json()
    return data.text || ''
  }

  async function sendEmail() {
    if (!creator?.email) return
    setAiLoading(true)
    const lines = ai.email.split('\n')
    const subject = lines[0].replace('Subject:', '').trim()
    const body = lines.slice(1).join('\n').trim()
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: creator.email,
        subject,
        body,
        fromName: campaign?.agency_name || 'The Agency',
      }),
    })
    setEmailSent(true)
    setAiLoading(false)
  }

  function briefCtx() {
    if (!campaign) return `Creator: ${creator?.name}`
    return `Brand: ${campaign.brand}
Product: ${campaign.product || 'the product'}
Deliverables: ${campaign.deliverables}
Budget offered: ${campaign.budget_min}
Posting window: ${campaign.date_from}-${campaign.date_to || 'end'}
Exclusivity: ${campaign.excl_days || '30'} days ${campaign.excl_cat || 'category'}
Usage rights: ${campaign.usage_months || '6'} months ${campaign.usage_channels || 'digital'}
Key message: ${campaign.message || 'not specified'}
Guidelines: ${campaign.guidelines || 'none'}`
  }

  async function genEmail() {
    setAiLoading(true)
    const prompt = `Draft an influencer outreach email on behalf of ${campaign?.agency_name || 'the agency'}. Tone: ${tone === 'warm' ? 'warm and professional' : tone === 'casual' ? 'casual and direct' : 'formal'}.

${briefCtx()}

Creator: ${creator?.name} (${creator?.handle}) on ${creator?.platform} with ${creator?.followers} followers in the ${creator?.niche} niche.

Start with "Subject: [subject]" then blank line then body. Under 180 words. Reference something specific about the creator's niche. State the ask clearly. End with a clear next step. Sign off from "${campaign?.agency_name || 'The Agency'} team".`
    const result = await callClaude(prompt, 400)
    setAi((p: any) => ({ ...p, email: result }))
    setAiLoading(false)
  }

  async function classifyReply() {
    setAiLoading(true)
    const prompt = `Analyse this influencer reply. Return ONLY valid JSON with: intent (Interested/Negotiating/Declining/Questions only), summary (one sentence), counter_rate (string or null), counter_date (string or null), exclusivity (string), risk (Low/Medium/High).

Reply: "Thanks for reaching out — ${campaign?.brand || 'your brand'} looks great and feels like a natural fit. I am definitely interested! The budget feels a bit low for ${campaign?.deliverables || 'the deliverables'}. My rate is ${campaign?.budget_max || '£1,500'}. Could the posting window start a few days later? Happy with exclusivity. ${creator?.name}"`
    const result = await callClaude(prompt, 300)
    setAi((p: any) => ({ ...p, reply: result }))
    setAiLoading(false)
  }

  async function genCounter() {
    setAiLoading(true)
    const prompt = `Draft a brief ${tone} reply email from ${campaign?.agency_name || 'the agency'} to ${creator?.name}. Accepting their counter-rate (${campaign?.budget_max || 'their rate'}) and adjusted start date. Campaign: ${campaign?.brand} — ${campaign?.deliverables}. Start with "Subject: [subject]" then blank line then body. Under 120 words. Confirm updated terms. Say contract will follow. Sign off from "${campaign?.agency_name || 'The Agency'} team".`
    const result = await callClaude(prompt, 300)
    setAi((p: any) => ({ ...p, counter: result }))
    setAiLoading(false)
  }

  async function genContract() {
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setAi((p: any) => ({ ...p, contract: true }))
    setAiLoading(false)
  }

  async function handleNext() {
    if (step === 0 && !ai.email) { await genEmail(); return }
    if (step === 0 && ai.email && !emailSent) { await sendEmail(); setDone(p => new Set([...p, step])); setStep(s => Math.min(s + 1, STEPS.length - 1)); return }
    if (step === 0 && emailSent) { setDone(p => new Set([...p, step])); setStep(s => Math.min(s + 1, STEPS.length - 1)); return }
    if (step === 1 && !ai.reply) { await classifyReply(); return }
    if (step === 3 && !ai.counter) { await genCounter(); return }
    if (step === 5 && !ai.contract) { await genContract(); return }
    if (step === 8) {
      await supabase.from('creators').update({ status: 'signed', last_activity: 'Signed today' }).eq('id', creator.id)
      router.push('/pipeline')
      return
    }
    setDone(p => new Set([...p, step]))
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

function emailDraft(content: string) {
  const lines = content.split('\n')
  const subj = lines[0].replace('Subject:', '').trim()
  const body = lines.slice(1).join('\n').trim()
  return (
    <div>
      <div style={{ background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '10px 14px', marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ color: '#5a5a70', fontSize: '11px', fontFamily: 'monospace', flexShrink: 0 }}>Subject</span>
        <input defaultValue={subj} style={{ background: 'transparent', border: 'none', color: '#e8e8f0', fontSize: '13px', fontWeight: '500', outline: 'none', width: '100%', fontFamily: 'sans-serif' }} />
      </div>
      <textarea defaultValue={body} style={{ width: '100%', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '14px', fontSize: '13px', color: '#e8e8f0', fontFamily: 'sans-serif', lineHeight: '1.7', resize: 'vertical', minHeight: '180px', outline: 'none', boxSizing: 'border-box' as const }} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
        <button onClick={() => { setAi((p: any) => ({ ...p, email: null })); setEmailSent(false); genEmail() }} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#9090a8', fontSize: '12px', cursor: 'pointer' }}>Regenerate</button>
        {creator?.email && !emailSent && <span style={{ fontSize: '11px', color: '#5a5a70' }}>Will send to {creator.email}</span>}
        {emailSent && <span style={{ fontSize: '11px', color: '#3ecf8e' }}>✓ Sent to {creator.email}</span>}
        {!creator?.email && <span style={{ fontSize: '11px', color: '#f5a623' }}>No email address — add one to the creator profile to send</span>}
      </div>
    </div>
  )
}
  function classifyResult(data: string) {
    let p: any = {}
    try { p = JSON.parse(data) } catch { p = { intent: 'Negotiating', summary: 'Creator is interested but requesting a higher rate and adjusted dates.', counter_rate: campaign?.budget_max || '£1,500', counter_date: 'Adjusted start', exclusivity: 'Agreed', risk: 'Low' } }
    return (
      <div style={{ background: '#1e1e24', border: '1px solid rgba(124,106,247,0.3)', borderRadius: '10px', padding: '14px 16px' }}>
        <div style={{ fontSize: '10px', color: '#a898ff', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>AI reply analysis</div>
        {[{ k: 'Intent', v: p.intent, warn: false }, { k: 'Counter rate', v: p.counter_rate, warn: true }, { k: 'Date request', v: p.counter_date, warn: true }, { k: 'Exclusivity', v: p.exclusivity, warn: false }, { k: 'Risk', v: p.risk, warn: false }].map(row => (
          <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
            <span style={{ color: '#9090a8' }}>{row.k}</span>
            <span style={{ color: row.warn ? '#f5a623' : '#3ecf8e', fontFamily: 'monospace', fontSize: '11px' }}>{row.v || '—'}</span>
          </div>
        ))}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#9090a8', lineHeight: '1.5' }}>{p.summary}</div>
      </div>
    )
  }

  function contractHtml() {
    const rate = campaign?.budget_max || campaign?.budget_min || creator?.rate || 'agreed rate'
    return (
      <div style={{ background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px 24px', fontSize: '12px', lineHeight: '1.8', color: '#9090a8', fontFamily: 'monospace', marginBottom: '12px' }}>
        <h4 style={{ fontSize: '13px', color: '#e8e8f0', fontWeight: '500', marginBottom: '12px', textAlign: 'center' as const }}>INFLUENCER COLLABORATION AGREEMENT</h4>
        <p style={{ marginBottom: '10px' }}>Between <span style={{ color: '#a898ff' }}>{campaign?.agency_name || 'Agency'} Ltd</span> on behalf of <span style={{ color: '#a898ff' }}>{campaign?.brand || 'Brand'}</span> and <span style={{ color: '#a898ff' }}>{creator?.name}</span> (<span style={{ color: '#a898ff' }}>{creator?.handle}</span>).</p>
        <p style={{ marginBottom: '10px' }}><strong style={{ color: '#e8e8f0' }}>1. Deliverables.</strong> Creator will produce <span style={{ color: '#a898ff' }}>{campaign?.deliverables}</span> featuring {campaign?.product || 'the product'}.</p>
        <p style={{ marginBottom: '10px' }}><strong style={{ color: '#e8e8f0' }}>2. Posting window.</strong> Between <span style={{ color: '#3ecf8e' }}>{campaign?.date_from}</span> and <span style={{ color: '#3ecf8e' }}>{campaign?.date_to || 'end of window'}</span>.</p>
        <p style={{ marginBottom: '10px' }}><strong style={{ color: '#e8e8f0' }}>3. Compensation.</strong> Total fee: <span style={{ color: '#f5a623' }}>{rate}</span>. Schedule: <span style={{ color: '#f5a623' }}>{campaign?.payment || '50% on signing, 50% on delivery'}</span>.</p>
        <p style={{ marginBottom: '10px' }}><strong style={{ color: '#e8e8f0' }}>4. Exclusivity.</strong> No competing {campaign?.excl_cat || 'category'} content for <span style={{ color: '#a898ff' }}>{campaign?.excl_days || '30'} days</span> after final post.</p>
        <p style={{ marginBottom: '10px' }}><strong style={{ color: '#e8e8f0' }}>5. Usage rights.</strong> Brand may repurpose content for <span style={{ color: '#a898ff' }}>{campaign?.usage_months || '6'} months</span> across {campaign?.usage_channels || 'digital'} channels.</p>
        <p><strong style={{ color: '#e8e8f0' }}>6. Disclosure.</strong> All posts comply with ASA/CAP and are labelled #ad.</p>
      </div>
    )
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9090a8', fontFamily: 'sans-serif' }}>
      Loading...
    </main>
  )

  const s = STEPS[step]
  const budget = campaign?.budget_max ? `${campaign.budget_min}-${campaign.budget_max}` : campaign?.budget_min || creator?.rate
  const win = campaign?.date_to ? `${campaign.date_from}-${campaign.date_to}` : campaign?.date_from || 'TBC'

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif', display: 'grid', gridTemplateColumns: '220px 1fr' }}>
      <aside style={{ background: '#16161a', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a898ff' }}>creatorflow</span>
          <a href="/pipeline" style={{ fontSize: '11px', color: '#9090a8', textDecoration: 'none' }}>Back</a>
        </div>
        <div style={{ margin: '12px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c6af7,#3ecf8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', color: '#fff', marginBottom: '8px' }}>
            {creator?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e8f0' }}>{creator?.name}</div>
          <div style={{ fontSize: '11px', color: '#5a5a70', fontFamily: 'monospace', marginBottom: '8px' }}>{creator?.handle} · {creator?.platform}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {[{ v: creator?.followers, l: 'Followers' }, { v: creator?.engagement, l: 'Engagement' }, { v: creator?.niche, l: 'Niche' }, { v: creator?.auth_score, l: 'Auth score' }].filter(x => x.v).map(x => (
              <div key={x.l} style={{ background: '#26262e', borderRadius: '4px', padding: '5px 7px' }}>
                <div style={{ fontSize: '11px', color: '#a898ff', fontFamily: 'monospace', fontWeight: '500' }}>{x.v}</div>
                <div style={{ fontSize: '10px', color: '#5a5a70' }}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>
        {campaign && (
          <div style={{ margin: '0 12px 12px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', fontFamily: 'monospace', marginBottom: '6px' }}>Campaign brief</div>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#e8e8f0', marginBottom: '6px' }}>{campaign.brand} — {campaign.product}</div>
            {[{ k: 'Deliverable', v: campaign.deliverables }, { k: 'Budget', v: budget }, { k: 'Window', v: win }].map(r => (
              <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#9090a8' }}>{r.k}</span>
                <span style={{ color: '#e8e8f0', fontFamily: 'monospace' }}>{r.v}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ padding: '0 8px', flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', fontFamily: 'monospace', padding: '8px 8px 4px' }}>Deal pipeline</div>
          {STEPS.map((st, i) => (
            <div key={i} onClick={() => (done.has(i) || i === step) && setStep(i)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: '6px', cursor: done.has(i) || i === step ? 'pointer' : 'default', background: i === step ? 'rgba(124,106,247,0.12)' : 'transparent', marginBottom: '2px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `1px solid ${i === step ? '#7c6af7' : done.has(i) ? '#3ecf8e' : 'rgba(255,255,255,0.12)'}`, background: i === step ? '#7c6af7' : done.has(i) ? '#3ecf8e' : '#26262e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff', flexShrink: 0 }}>
                {done.has(i) ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '11px', color: i === step ? '#a898ff' : '#9090a8', lineHeight: '1.3' }}>{st.title}</span>
              {st.ai && <span style={{ fontSize: '9px', background: 'rgba(124,106,247,0.12)', color: '#a898ff', border: '1px solid rgba(124,106,247,0.3)', borderRadius: '4px', padding: '1px 4px', fontFamily: 'monospace', marginLeft: 'auto', flexShrink: 0 }}>AI</span>}
            </div>
          ))}
        </div>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '2px', background: '#26262e' }}>
          <div style={{ height: '100%', background: '#7c6af7', width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#16161a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#5a5a70', fontFamily: 'monospace', marginBottom: '3px' }}>Step {step + 1} of {STEPS.length}</div>
            <div style={{ fontSize: '17px', fontWeight: '500', color: '#e8e8f0' }}>{s.title}</div>
            <div style={{ fontSize: '12px', color: '#9090a8', marginTop: '3px' }}>{s.sub}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', paddingTop: '4px' }}>
            {s.who.map(w => (
              <span key={w} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontFamily: 'monospace', background: w === 'AI' ? 'rgba(124,106,247,0.12)' : w === 'Creator' ? 'rgba(62,207,142,0.1)' : '#26262e', color: w === 'AI' ? '#a898ff' : w === 'Creator' ? '#3ecf8e' : '#9090a8', border: `1px solid ${w === 'AI' ? 'rgba(124,106,247,0.3)' : w === 'Creator' ? 'rgba(62,207,142,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
                {w}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {aiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(124,106,247,0.12)', border: '1px solid rgba(124,106,247,0.3)', borderRadius: '10px', marginBottom: '14px', fontSize: '12px', color: '#a898ff' }}>
              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(124,106,247,0.3)', borderTopColor: '#7c6af7', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              <span>Claude is working...</span>
            </div>
          )}

          {step === 0 && (
            <div>
              <div style={{ fontSize: '11px', color: '#5a5a70', background: '#1e1e24', borderRadius: '6px', padding: '8px 12px', borderLeft: '2px solid rgba(124,106,247,0.3)', marginBottom: '12px', lineHeight: '1.5' }}>
                AI personalises this email using {creator?.name}'s profile and your {campaign?.brand} campaign brief.
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                {['warm', 'casual', 'formal'].map(t => (
                  <button key={t} onClick={() => setTone(t)} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', border: '1px solid', borderColor: tone === t ? 'rgba(124,106,247,0.3)' : 'rgba(255,255,255,0.07)', background: tone === t ? 'rgba(124,106,247,0.12)' : 'transparent', color: tone === t ? '#a898ff' : '#9090a8', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    {t === 'warm' ? 'Warm & professional' : t === 'casual' ? 'Casual & direct' : 'Formal'}
                  </button>
                ))}
              </div>
              <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                {ai.email ? emailDraft(ai.email) : <div style={{ textAlign: 'center' as const, padding: '36px', color: '#5a5a70', fontSize: '13px' }}>Click "Generate email" to draft with AI</div>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#5a5a70', fontFamily: 'monospace', marginBottom: '6px' }}>You sent outreach · 2 days ago</div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />
                <div style={{ fontSize: '11px', color: '#5a5a70', fontFamily: 'monospace', marginBottom: '6px' }}>{creator?.name} replied · Just now</div>
                <div style={{ fontSize: '13px', color: '#e8e8f0', lineHeight: '1.7' }}>
                  Hi there,<br /><br />
                  Thanks for reaching out — {campaign?.brand || 'your brand'} looks gorgeous and feels like a natural fit.<br /><br />
                  I'm definitely interested! The budget feels a bit low for {campaign?.deliverables || 'the deliverables'}. My rate is {campaign?.budget_max || '£1,500'}. Could the posting window start a few days later?<br /><br />
                  Happy with the exclusivity terms.<br /><br />
                  {creator?.name} x
                </div>
              </div>
              {ai.reply ? classifyResult(ai.reply) : <div style={{ textAlign: 'center' as const, padding: '20px', color: '#5a5a70', fontSize: '13px' }}>Click "Classify reply" to extract terms</div>}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Offered vs counter</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { l: 'Your offer', v: campaign?.budget_min, c: '#e8e8f0' },
                      { l: 'Creator asks', v: campaign?.budget_max || '£1,500', c: '#f5a623' },
                      { l: 'Start offered', v: campaign?.date_from, c: '#e8e8f0' },
                      { l: 'Creator asks', v: 'Adjusted start', c: '#f5a623' },
                      { l: 'Exclusivity', v: 'Agreed', c: '#3ecf8e' },
                      { l: 'Deliverables', v: 'Agreed', c: '#3ecf8e' },
                    ].map(x => (
                      <div key={x.l} style={{ background: '#1e1e24', borderRadius: '6px', padding: '8px 10px' }}>
                        <div style={{ fontSize: '10px', color: '#5a5a70', marginBottom: '3px' }}>{x.l}</div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: x.c }}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Recommendation</div>
                  <div style={{ fontSize: '13px', color: '#9090a8', lineHeight: '1.6', marginBottom: '12px' }}>Both counter-requests are reasonable and within budget ceiling. Recommend accepting both.</div>
                  <button onClick={() => setApproved(true)} style={{ padding: '7px 14px', borderRadius: '6px', background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.25)', color: '#3ecf8e', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    {approved ? '✓ Approved' : 'Accept both'}
                  </button>
                  {approved && <div style={{ fontSize: '12px', color: '#3ecf8e', marginTop: '8px' }}>Terms approved</div>}
                </div>
              </div>
              <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Rate benchmark</div>
                <div style={{ fontSize: '11px', color: '#5a5a70', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Low</span><span>Market range</span><span>High</span>
                </div>
                <div style={{ height: '6px', background: '#26262e', borderRadius: '3px', position: 'relative', marginBottom: '10px' }}>
                  <div style={{ position: 'absolute', height: '100%', background: 'rgba(124,106,247,0.12)', border: '1px solid rgba(124,106,247,0.3)', borderRadius: '3px', left: '20%', width: '55%' }} />
                  <div style={{ position: 'absolute', top: '-3px', width: '12px', height: '12px', borderRadius: '50%', background: '#7c6af7', transform: 'translateX(-50%)', left: '37%' }} />
                  <div style={{ position: 'absolute', top: '-3px', width: '12px', height: '12px', borderRadius: '50%', background: '#5a5a70', transform: 'translateX(-50%)', left: '25%' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#9090a8', lineHeight: '1.5' }}>Counter-rate is within the typical range for this creator tier and niche.</div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ fontSize: '11px', color: '#5a5a70', background: '#1e1e24', borderRadius: '6px', padding: '8px 12px', borderLeft: '2px solid rgba(124,106,247,0.3)', marginBottom: '12px' }}>
                AI drafts the counter-offer accepting the creator's terms, in your agency's tone.
              </div>
              <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                {ai.counter ? emailDraft(ai.counter) : <div style={{ textAlign: 'center' as const, padding: '36px', color: '#5a5a70', fontSize: '13px' }}>Click "Draft counter-offer" to generate</div>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={{ background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.25)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3ecf8e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#0f0f11', flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontSize: '13px', color: '#3ecf8e', fontWeight: '500' }}>Terms agreed — deal locked</div>
                  <div style={{ fontSize: '12px', color: '#9090a8', marginTop: '2px' }}>All terms confirmed.</div>
                </div>
              </div>
              <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Locked deal summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { l: 'Creator', v: creator?.name },
                    { l: 'Brand', v: campaign?.brand },
                    { l: 'Rate', v: campaign?.budget_max || campaign?.budget_min },
                    { l: 'Deliverables', v: campaign?.deliverables },
                    { l: 'Window', v: win },
                    { l: 'Exclusivity', v: `${campaign?.excl_days || '30'} days` },
                    { l: 'Usage rights', v: `${campaign?.usage_months || '6'} months` },
                    { l: 'Payment', v: campaign?.payment || '50%/50%' },
                  ].map(x => (
                    <div key={x.l} style={{ background: '#1e1e24', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#5a5a70', marginBottom: '3px' }}>{x.l}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#3ecf8e' }}>{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div style={{ fontSize: '11px', color: '#5a5a70', background: '#1e1e24', borderRadius: '6px', padding: '8px 12px', borderLeft: '2px solid rgba(124,106,247,0.3)', marginBottom: '12px' }}>
                AI populates the contract from the locked deal summary.
              </div>
              {ai.contract ? contractHtml() : <div style={{ textAlign: 'center' as const, padding: '36px', color: '#5a5a70', fontSize: '13px', background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>Click "Generate contract" to populate</div>}
            </div>
          )}

          {step === 6 && (() => {
            const rate = campaign?.budget_max || campaign?.budget_min || creator?.rate
            const items = [
              `Rate confirmed: ${rate}`,
              `Deliverables: ${campaign?.deliverables}`,
              `Window: ${win}`,
              `Exclusivity: ${campaign?.excl_days || '30'} days`,
              `Usage: ${campaign?.usage_months || '6'} months`,
              `Payment: ${campaign?.payment || '50% on signing, 50% on delivery'}`,
              'Disclosure clause included (ASA/CAP)',
              'Content approval window confirmed',
            ]
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Review checklist</div>
                  {items.map((item, i) => (
                    <div key={i} onClick={() => { const n = new Set(checked); n.has(i) ? n.delete(i) : n.add(i); setChecked(n) }} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `1px solid ${checked.has(i) ? 'rgba(62,207,142,0.25)' : 'rgba(255,255,255,0.12)'}`, background: checked.has(i) ? 'rgba(62,207,142,0.1)' : '#26262e', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#3ecf8e' }}>
                        {checked.has(i) ? '✓' : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: checked.has(i) ? '#5a5a70' : '#9090a8', textDecoration: checked.has(i) ? 'line-through' : 'none' }}>{item}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Approval status</div>
                  <div style={{ fontSize: '12px', color: checked.size < items.length ? '#f5a623' : '#3ecf8e' }}>
                    {checked.size < items.length ? `${checked.size}/${items.length} items reviewed` : '✓ All reviewed — ready to send'}
                  </div>
                </div>
              </div>
            )
          })()}

          {step === 7 && (
            <div>
              <div style={{ background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.25)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3ecf8e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#0f0f11', flexShrink: 0 }}>✉</div>
                <div>
                  <div style={{ fontSize: '13px', color: '#3ecf8e', fontWeight: '500' }}>Contract sent to {creator?.name}</div>
                  <div style={{ fontSize: '12px', color: '#9090a8', marginTop: '2px' }}>Signing link delivered · Today</div>
                </div>
              </div>
              <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Automated reminders</div>
                {[{ l: 'Reminder 1', v: '48 hours — scheduled' }, { l: 'Reminder 2', v: '5 days — pending' }].map(r => (
                  <div key={r.l} style={{ background: '#1e1e24', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#5a5a70', marginBottom: '3px' }}>{r.l}</div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#e8e8f0' }}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 8 && (
            <div>
              <div style={{ background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.25)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3ecf8e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#0f0f11', flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontSize: '13px', color: '#3ecf8e', fontWeight: '500' }}>Contract signed — campaign unlocked</div>
                  <div style={{ fontSize: '12px', color: '#9090a8', marginTop: '2px' }}>{creator?.name} signed. All automations triggered.</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Triggered automatically</div>
                  {['Deal status set to Signed', 'Payment milestone created', 'Posting dates added to calendar', 'Creator notified with brief', `${campaign?.brand || 'Brand'} notified`].map((t, i, arr) => (
                    <div key={t} style={{ display: 'flex', gap: '10px', padding: '6px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3ecf8e', flexShrink: 0, marginTop: '3px' }} />
                        {i < arr.length - 1 && <div style={{ width: '1px', flex: 1, background: 'rgba(255,255,255,0.05)', margin: '3px 0', minHeight: '10px' }} />}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#e8e8f0', paddingBottom: '4px' }}>{t}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '10px', color: '#5a5a70', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '10px' }}>Time saved vs manual</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#1e1e24', borderRadius: '6px', padding: '12px', textAlign: 'center' as const }}>
                      <div style={{ fontSize: '20px', fontWeight: '500', color: '#a898ff', fontFamily: 'monospace' }}>~4hrs</div>
                      <div style={{ fontSize: '11px', color: '#5a5a70', marginTop: '2px' }}>Saved drafting</div>
                    </div>
                    <div style={{ background: '#1e1e24', borderRadius: '6px', padding: '12px', textAlign: 'center' as const }}>
                      <div style={{ fontSize: '20px', fontWeight: '500', color: '#3ecf8e', fontFamily: 'monospace' }}>3 days</div>
                      <div style={{ fontSize: '11px', color: '#5a5a70', marginTop: '2px' }}>Faster to signed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#16161a' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => Math.max(0, s - 1))} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#9090a8', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step === 2 && !approved && <span style={{ fontSize: '11px', color: '#f5a623', fontFamily: 'monospace' }}>Approve terms first</span>}
          {step === 6 && checked.size < 8 && <span style={{ fontSize: '11px', color: '#f5a623', fontFamily: 'monospace' }}>{checked.size}/8 items reviewed</span>}
          <button
            onClick={handleNext}
            disabled={aiLoading || (step === 2 && !approved) || (step === 6 && checked.size < 8)}
            style={{ padding: '9px 20px', borderRadius: '6px', background: '#7c6af7', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '500', cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading || (step === 2 && !approved) || (step === 6 && checked.size < 8) ? 0.5 : 1, fontFamily: 'sans-serif' }}
          >
            {step === 0 && !ai.email ? 'Generate email' : step === 0 && ai.email && !emailSent && creator?.email ? 'Send email' : step === 1 && !ai.reply ? 'Classify reply' : step === 3 && !ai.counter ? 'Draft counter-offer' : step === 5 && !ai.contract ? 'Generate contract' : step === 8 ? 'Mark as signed' : 'Next'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}