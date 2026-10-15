/**
 * QUOI     — le bloc Activité des fiches d'administration : des chiffres, puis les derniers gestes.
 * POURQUOI — voir d'un coup d'œil si le compte vit ; la fiche d'une enseigne et celle d'une
 *            personne le montrent pareil, seules les tuiles changent.
 */
import { Activity } from 'lucide-react'
import type { CSSProperties } from 'react'
import { AdminCard } from '@/components/ui/AdminCard'
import { timeAgo } from '@/lib/dates'

interface Tile {
  label: string
  value: number
}

interface Gesture {
  quand: string
  quoi: string
}

export function ActivityCard({ tiles, gestures }: { tiles: Tile[]; gestures: Gesture[] }) {
  const now = new Date()
  return (
    <AdminCard title="Activité" Icon={Activity} tone="bleu">
      <div className="sheet-tiles" style={{ '--tiles': String(tiles.length) } as CSSProperties}>
        {tiles.map((tile) => (
          <div key={tile.label} className="sheet-tile">
            <span className="sheet-tile__value">{tile.value}</span>
            <span className="sheet-tile__label">{tile.label}</span>
          </div>
        ))}
      </div>
      {gestures.length > 0 && (
        <ul className="sheet-gestures">
          {gestures.map((gesture, index) => (
            <li key={`${index}-${gesture.quand}`} className="sheet-gesture">
              <span className="sheet-gesture__when">{timeAgo(new Date(gesture.quand), now)}</span>
              <span className="sheet-gesture__what">{gesture.quoi}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  )
}
