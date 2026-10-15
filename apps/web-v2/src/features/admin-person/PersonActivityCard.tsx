/**
 * QUOI     — le bloc Activité : quatre chiffres, puis les derniers gestes de la personne et de ses enseignes.
 * POURQUOI — voir d'un coup d'œil si le compte vit (dates suivies, avis, questions et réponses, fiches).
 */
import { Activity } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { timeAgo } from '@/lib/dates'
import type { Gesture, PersonFields } from './useAdminPerson'

export function PersonActivityCard({
  person,
  gestures,
}: {
  person: PersonFields
  gestures: Gesture[]
}) {
  const now = new Date()
  const tiles = [
    { label: 'Dates suivies', value: person.dates },
    { label: 'Avis écrits', value: person.avis },
    { label: 'Questions et réponses', value: person.questions },
    { label: 'Fiches créées', value: person.fiches },
  ]
  return (
    <AdminCard title="Activité" Icon={Activity} tone="bleu">
      <div className="sheet-tiles person-tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className="sheet-tile">
            <span className="sheet-tile__value">{tile.value}</span>
            <span className="sheet-tile__label">{tile.label}</span>
          </div>
        ))}
      </div>
      {gestures.length > 0 && (
        <ul className="sheet-gestures">
          {gestures.map((gesture) => (
            <li key={`${gesture.quand}-${gesture.quoi}`} className="sheet-gesture">
              <span className="sheet-gesture__when">{timeAgo(new Date(gesture.quand), now)}</span>
              <span className="sheet-gesture__what">{gesture.quoi}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  )
}
