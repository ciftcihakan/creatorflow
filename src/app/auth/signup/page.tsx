'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { agency_name: agencyName }
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for a confirmation link.')
    }
    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0f0f11',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: '#16161a',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{ color: '#e8e8f0', fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>
          Create your account
        </h1>
        <p style={{ color: '#9090a8', fontSize: '13px', marginBottom: '28px' }}>
          Set up your agency workspace on Creatorflow
        </p>

        <form onSubmit={handleSignUp}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9090a8', fontSize: '12px', marginBottom: '6px' }}>
              Agency name
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              required
              placeholder="e.g. Lumiere Agency"
              style={{
                width: '100%',
                background: '#1e1e24',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e8e8f0',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#9090a8', fontSize: '12px', marginBottom: '6px' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@agency.com"
              style={{
                width: '100%',
                background: '#1e1e24',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e8e8f0',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#9090a8', fontSize: '12px', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Minimum 6 characters"
              style={{
                width: '100%',
                background: '#1e1e24',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e8e8f0',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(240,96,96,0.1)',
              border: '1px solid rgba(240,96,96,0.25)',
              borderRadius: '8px',
              padding: '10px 12px',
              color: '#f06060',
              fontSize: '12px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              background: 'rgba(62,207,142,0.1)',
              border: '1px solid rgba(62,207,142,0.25)',
              borderRadius: '8px',
              padding: '10px 12px',
              color: '#3ecf8e',
              fontSize: '12px',
              marginBottom: '16px',
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#7c6af7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '11px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ color: '#9090a8', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
          Already have an account?{' '}
          <a href="/auth/login" style={{ color: '#a898ff', textDecoration: 'none' }}>
            Log in
          </a>
        </p>
      </div>
    </main>
  )
}