/**
 * QUOI     — « C'est ainsi qu'on te verra dans le réseau » : une ligne d'activité au nom de la
 *            personne et de sa marque.
 * POURQUOI — Uriel, 11/10/2026 : demander le prénom sans dire à quoi il sert trouble, puisque les
 *            exposants parlent au nom de leur marque. La ligne montre « Uriel de Atelier Sauvage »,
 *            comme l'activité du réseau l'écrit déjà.
 */
import { Avatar } from '@/components/ui/Avatar'

interface ActivityPreviewProps {
  firstName: string
  brand: string
  avatarUrl?: string | null
}

export function ActivityPreview({ firstName, brand, avatarUrl }: ActivityPreviewProps) {
  const who = `${firstName.trim() || 'Ton prénom'} de ${brand.trim() || 'ta marque'}`
  return (
    <div className="activity-preview">
      <p className="activity-preview__lead">C’est ainsi qu’on te verra dans le réseau :</p>
      <p className="activity-preview__line">
        <Avatar
          className="activity-preview__avatar"
          src={avatarUrl}
          name={firstName.trim() || '?'}
        />
        <span>
          <b>{who}</b> a ajouté Les Aventuriales
        </span>
      </p>
    </div>
  )
}
