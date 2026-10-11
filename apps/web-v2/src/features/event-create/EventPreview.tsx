/**
 * QUOI     — l'aperçu de la date qu'on ajoute : l'affiche (ou sa place en pointillés), le nom, les
 *            dates et le lieu, les catégories, et ce que la création fait pour soi.
 * POURQUOI — maquette 2082:2 (lot 10b) : ce qui manque garde sa place et dit à quelle étape il
 *            viendra.
 * ATTENTION — « tu y es inscrit en Intéressé » ne se dit que si c'est vrai : en gratuit, une date
 *            au-delà de 6 mois entre dans l'annuaire sans inscription (lib/plan.ts).
 */
import { Check, ImageIcon } from 'lucide-react'
import { Tag } from '@/components/ui/Tag'
import { previewPlace } from '@/lib/create-event'
import { parseSqlDate } from '@/lib/dates'
import { canActOn } from '@/lib/plan'
import { tagStyleFor } from '@/lib/tags'
import { useTagStyles } from '@/lib/useTagStyles'
import type { EventDraft } from './useEventDraft'

interface EventPreviewProps {
  draft: EventDraft
  /** L'affiche choisie, pas encore envoyée : on l'affiche depuis le navigateur. */
  posterUrl: string | null
  pro: boolean
}

export function EventPreview({ draft, posterUrl, pro }: EventPreviewProps) {
  const styles = useTagStyles()
  const place = previewPlace(draft)
  const enrolled = !draft.startDate || canActOn(parseSqlDate(draft.startDate), pro, new Date())

  return (
    <aside className="preview" aria-label="Aperçu">
      <p className="preview__label">Aperçu</p>
      {posterUrl ? (
        <img className="preview__poster" src={posterUrl} alt="" />
      ) : (
        <span className="preview__poster preview__poster--empty">
          <ImageIcon size={24} strokeWidth={1.5} />
          L’affiche viendra à l’étape 4
        </span>
      )}
      <p className={draft.name.trim() ? 'preview__name' : 'preview__name preview__name--empty'}>
        {draft.name.trim() || 'Sans nom pour l’instant'}
      </p>
      <p className="preview__meta">{place ?? 'Date et lieu à l’étape suivante'}</p>
      {draft.tags.length > 0 && (
        <div className="preview__tags">
          {draft.tags.map((tag) => (
            <Tag key={tag} name={tag} style={tagStyleFor(styles, tag)} />
          ))}
        </div>
      )}
      {enrolled && (
        <p className="preview__note">
          <Check size={13} strokeWidth={2} />À la création, tu y es inscrit en « Intéressé ».
        </p>
      )}
    </aside>
  )
}
