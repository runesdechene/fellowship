import { useAuth } from '@/lib/auth'
import { Navigate } from 'react-router-dom'
import { PublicProfilePage } from './PublicProfile'

export function ProfilePage() {
  const { user, profile, loading } = useAuth()

  // Still loading auth or profile not fetched yet
  if (loading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (!profile?.public_slug) {
    return <Navigate to="/reglages" replace />
  }

  return <PublicProfilePage overrideSlug={profile.public_slug} />
}
