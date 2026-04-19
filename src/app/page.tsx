export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0f0f11',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      color: '#e8e8f0'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', marginBottom: '8px' }}>
          creatorflow
        </h1>
        <p style={{ color: '#9090a8', fontSize: '14px' }}>
          Influencer campaign platform — coming soon
        </p>
      </div>
    </main>
  )
}