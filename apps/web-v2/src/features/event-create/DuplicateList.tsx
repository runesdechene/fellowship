/**
 * QUOI     — les événements qui ressemblent au nom tapé : affiche, nom, dates, lieu, inscrits (ou
 *            « Passé »), « Ouvrir → », et « C'est sa nouvelle édition » sur un festival passé.
 * POURQUOI — maquette 2082:2 (lot 10b) : ouvrir le festival qui existe plutôt que d'en créer un
 *            second ; relier une nouvelle édition à la précédente (lot 8b, gardé par Uriel).
 */
import { ArrowRight, Copy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Poster } from '@/components/ui/Poster'
import { duplicateLine } from '@/lib/create-event'
import { parseSqlDate } from '@/lib/dates'
import { canBePreviousEdition } from '@/lib/editions'
import type { SimilarEvent } from './useSimilarEvents'
import { eventPath } from '@/lib/event-path'

interface DuplicateListProps {
  similar: SimilarEvent[]
  previousEditionId: string
  /** Choisir (ou, recliqué, annuler) l'édition précédente du festival qu'on ajoute. */
  onPickEdition: (id: string) => void
}

export function DuplicateList({ similar, previousEditionId, onPickEdition }: DuplicateListProps) {
  const today = new Date()
  return (
    <section className="dupes" aria-label="Événements qui ressemblent">
      <p className="dupes__title">
        <Copy size={15} strokeWidth={1.8} />
        {similar.length === 1
          ? 'Un événement ressemble'
          : `${String(similar.length)} événements ressemblent`}
      </p>
      {similar.map((event) => {
        const line = duplicateLine(event, today)
        const picked = previousEditionId === event.id
        const year = parseSqlDate(event.startDate).getFullYear()
        return (
          <div key={event.id} className="dupe">
            <Poster imageUrl={event.imageUrl} tags={event.tags} className="dupe__poster" />
            <span className="dupe__identity">
              <span className="dupe__name">{event.name}</span>
              <span className="dupe__meta">{line.meta}</span>
            </span>
            <span className="dupe__actions">
              {canBePreviousEdition(event.startDate, today) && (
                <button
                  type="button"
                  className={picked ? 'dupe__edition dupe__edition--on' : 'dupe__edition'}
                  aria-pressed={picked}
                  onClick={() => {
                    onPickEdition(picked ? '' : event.id)
                  }}
                >
                  {picked ? `✓ Nouvelle édition de ${String(year)}` : 'C’est sa nouvelle édition'}
                </button>
              )}
              <Link className="dupe__open" to={eventPath(event.id)}>
                Ouvrir <ArrowRight size={13} strokeWidth={2} />
              </Link>
            </span>
          </div>
        )
      })}
      <p className="dupes__note">
        Si c’est l’un d’eux, ouvre-le plutôt que d’en créer un second : tu y retrouveras les autres
        exposants.
      </p>
    </section>
  )
}
