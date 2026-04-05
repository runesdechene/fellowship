import { useAuth } from '@/lib/auth'
import { Navigate } from 'react-router-dom'
import { PublicProfilePage } from './PublicProfile'

export function ProfilePage() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (!profile?.public_slug) {
    return <Navigate to="/reglages" replace />
  }

  // Render the unified profile page inline (within AppLayout)
  return <PublicProfilePage overrideSlug={profile.public_slug} />
}
