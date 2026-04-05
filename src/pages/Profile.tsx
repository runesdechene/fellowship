import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export function ProfilePage() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (profile?.public_slug) {
    return <Navigate to={`/@${profile.public_slug}`} replace />
  }

  return <Navigate to="/reglages" replace />
}
