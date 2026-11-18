/**
 * QUOI     — la liste des exposants qui s'ouvre au-dessus d'un champ quand on tape « @ » : avatar,
 *            nom, « Ton ami » ou la ville ; la première ligne est présélectionnée.
 * POURQUOI — maquette Story 2844:1023, validée par Uriel le 18/11/2026.
 * ATTENTION — le parent du champ est en `position: relative` : la liste s'y pose. Un appui garde
 *            le clavier dans le champ (`onMouseDown`), sinon le choix le ferait perdre.
 */
import { Avatar } from '@/components/ui/Avatar'
import type { MentionCandidate } from '@/lib/mention-search'

interface Props {
  candidates: MentionCandidate[]
  active: number
  onChoose: (candidate: MentionCandidate) => void
  /** Sous le champ plutôt qu'au-dessus : le mot d'un sujet est en haut de l'écran. */
  below?: boolean
}

export function MentionList({ candidates, active, onChoose, below = false }: Props) {
  if (candidates.length === 0) return null
  return (
    <ul
      className={below ? 'mention-list mention-list--below' : 'mention-list'}
      role="listbox"
      aria-label="Exposants à taguer"
    >
      {candidates.map((candidate, index) => (
        <li key={candidate.id} role="option" aria-selected={index === active}>
          <button
            type="button"
            className="mention-list__item"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChoose(candidate)}
          >
            <Avatar className="mention-list__avatar" src={candidate.avatar} name={candidate.name} />
            <span className="mention-list__who">
              <span className="mention-list__name">{candidate.name}</span>
              <span className="mention-list__meta">
                {candidate.friend ? 'Ton ami' : (candidate.city ?? '')}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
