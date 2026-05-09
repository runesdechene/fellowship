export function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif',
      gap: '1rem',
      color: '#3d3028',
      background: '#f5f0e8',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Une erreur est survenue</h1>
      <p style={{ opacity: 0.7, maxWidth: '32ch' }}>
        Désolé, l'application a rencontré un problème inattendu.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '0.5rem 1.25rem',
          borderRadius: '9999px',
          background: '#3d3028',
          color: '#f5f0e8',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Recharger la page
      </button>
    </div>
  )
}
