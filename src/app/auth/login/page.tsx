'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
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
          Welcome back
        </h1>
        <p style={{ color: '#9090a8', fontSize: '13px', marginBottom: '28px' }}>
          Log in to your Creatorflow workspace
        </p>

        <form onSubmit={handleLogin}>
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
              placeholder="Your password"
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
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p style={{ color: '#9090a8', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
          Don't have an account?{' '}
          <a href="/auth/signup" style={{ color: '#a898ff', textDecoration: 'none' }}>
            Sign up
          </a>
        </p>
      </div>
    </main>
  )
}