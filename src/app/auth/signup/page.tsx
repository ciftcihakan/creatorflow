'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const inp = {
    width: '100%', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px', padding: '10px 12px', color: '#e8e8f0', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'sans-serif',
  }
  const lbl = {
    display: 'block' as const, color: '#9090a8', fontSize: '12px',
    marginBottom: '6px', fontWeight: '500' as const,
  }

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '380px', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '18px', color: '#a898ff', marginBottom: '24px' }}>creatorflow</div>
          <div style={{ background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.25)', borderRadius: '12px', padding: '28px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#3ecf8e', marginBottom: '8px' }}>Check your email</div>
            <div style={{ fontSize: '13px', color: '#9090a8', lineHeight: '1.6' }}>
              We sent a confirmation link to <span style={{ color: '#e8e8f0' }}>{email}</span>. Click it to activate your account.
            </div>
          </div>
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#5a5a70' }}>
            Already confirmed?{' '}
            <a href="/auth/login" style={{ color: '#a898ff', textDecoration: 'none' }}>Sign in</a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '18px', color: '#a898ff', marginBottom: '8px' }}>creatorflow</div>
          <div style={{ fontSize: '13px', color: '#5a5a70' }}>Create your account</div>
        </div>

        {/* Card */}
        <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '28px' }}>
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Full name</label>
              <input
                style={inp}
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Sarah Jones"
                autoFocus
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Work email</label>
              <input
                style={inp}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@agency.com"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={lbl}>Password</label>
              <input
                style={inp}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(240,96,96,0.1)', border: '1px solid rgba(240,96,96,0.25)', borderRadius: '8px', padding: '10px 14px', color: '#f06060', fontSize: '12px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#7c6af7', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'sans-serif' }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Sign in link */}
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#5a5a70' }}>
          Already have an account?{' '}
          <a href="/auth/login" style={{ color: '#a898ff', textDecoration: 'none' }}>Sign in</a>
        </div>
      </div>
    </main>
  )
}
