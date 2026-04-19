'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    }
    getUser()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9090a8', fontFamily: 'sans-serif', fontSize: '13px' }}>
        Loading...
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#16161a', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a898ff' }}>
          creatorflow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#9090a8', fontSize: '12px' }}>
            {user?.user_metadata?.agency_name || user?.email}
          </span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '5px 12px', color: '#9090a8', fontSize: '12px', cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      </div>
      <div style={{ padding: '40px 28px' }}>
        <h1 style={{ color: '#e8e8f0', fontSize: '22px', fontWeight: '500', marginBottom: '8px' }}>
          Welcome to Creatorflow
        </h1>
        <p style={{ color: '#9090a8', fontSize: '13px', marginBottom: '40px' }}>
          Your influencer campaign platform is ready.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '700px' }}>
          <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Campaigns</div>
            <div style={{ fontSize: '28px', fontWeight: '500', color: '#e8e8f0', marginBottom: '4px' }}>0</div>
            <div style={{ fontSize: '11px', color: '#5a5a70' }}>No campaigns yet</div>
          </div>
          <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Creators</div>
            <div style={{ fontSize: '28px', fontWeight: '500', color: '#e8e8f0', marginBottom: '4px' }}>0</div>
            <div style={{ fontSize: '11px', color: '#5a5a70' }}>No creators added</div>
          </div>
          <div style={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#5a5a70', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Active deals</div>
            <div style={{ fontSize: '28px', fontWeight: '500', color: '#e8e8f0', marginBottom: '4px' }}>0</div>
            <div style={{ fontSize: '11px', color: '#5a5a70' }}>No deals in progress</div>
          </div>
        </div>
      </div>
    </main>
  )
}