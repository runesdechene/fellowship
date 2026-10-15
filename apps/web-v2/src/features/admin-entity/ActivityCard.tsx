/**
 * QUOI     — le bloc Activité : cinq chiffres, puis les derniers gestes de l'enseigne.
 * POURQUOI — voir d'un coup d'œil si le compte vit (dates suivies, avis, bilans, fiches, abonnés).
 */
import { Activity } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { timeAgo } from '@/lib/dates'
import type { EntityFields, Gesture } from './useAdminEntity'

export function ActivityCard({ entity, gestures }: { entity: EntityFields; gestures: Gesture[] }) {
  const now = new Date()
  const tiles = [
    { label: 'Dates suivies', value: entity.dates },
    { label: 'Avis écrits', value: entity.avis },
    { label: 'Bilans', value: entity.bilans },
    { label: 'Fiches créées', value: entity.fiches },
    { label: 'Abonnés', value: entity.abonnes },
  ]
  return (
    <AdminCard title="Activité" Icon={Activity} tone="bleu">
      <div className="sheet-tiles">
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
