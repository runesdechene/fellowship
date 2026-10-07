import { useAuth } from '@/lib/auth'
import { Navigate } from 'react-router-dom'
import { PublicProfilePage } from './PublicProfile'

export function ProfilePage() {
  const { currentActorRow, loading, identityLoading } = useAuth()

  // Still loading auth or identity not fetched yet
  if (loading || identityLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Chargement…
      </div>
    )
  }

  // Identité publique = l'entité active (vitrine). Une personne n'a pas de vitrine publique
  // -> on l'envoie vers ses réglages. (Modèle acteur : seules les entities ont un public_slug.)
  const slug = currentActorRow && 'public_slug' in currentActorRow ? currentActorRow.public_slug : null
  if (!slug) {
    return <Navigate to="/reglages" replace />
  }

  return <PublicProfilePage overrideSlug={slug} />
}
