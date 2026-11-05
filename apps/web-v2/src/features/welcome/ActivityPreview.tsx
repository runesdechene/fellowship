/**
 * QUOI     — « C'est ainsi qu'on te verra dans le réseau » : une ligne d'activité au nom de la
 *            marque, telle que le fil l'écrit (« Atelier Sauvage a ajouté… »).
 * POURQUOI — l'aperçu promettait « Uriel de Atelier Sauvage », que l'app n'écrit nulle part
 *            (Uriel, 05/11/2026). Le prénom au fil de l'activité viendra quand il servira.
 */
import { Avatar } from '@/components/ui/Avatar'

interface ActivityPreviewProps {
  brand: string
  avatarUrl?: string | null
}

export function ActivityPreview({ brand, avatarUrl }: ActivityPreviewProps) {
  const who = brand.trim() || 'Ta marque'
  return (
    <div className="activity-preview">
      <p className="activity-preview__lead">C’est ainsi qu’on te verra dans le réseau :</p>
      <p className="activity-preview__line">
        <Avatar className="activity-preview__avatar" src={avatarUrl} name={who} />
        <span>
          <b>{who}</b> a ajouté Les Aventuriales
        </span>
      </p>
    </div>
  )
}
