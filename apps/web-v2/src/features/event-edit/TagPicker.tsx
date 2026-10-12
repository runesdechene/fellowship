/**
 * QUOI     — les catégories d'une fiche en modification : les choisies en pastilles de leur couleur,
 *            retirables d'un « × », et « + Ajouter » qui déroule les autres.
 * POURQUOI — maquette 2117:2 (lot 10c) : on voit d'un coup d'œil les catégories de la fiche ; la
 *            première reste la principale (elle classe l'événement).
 * ATTENTION — les couleurs sont des DONNÉES réglées en administration, d'où les variables posées en
 *            ligne, comme dans `Tag`.
 */
import { Plus, X } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { tagStyleFor } from '@/lib/tags'
import { useTagStyles } from '@/lib/useTagStyles'

interface TagPickerProps {
  chosen: string[]
  all: string[]
  onToggle: (tag: string) => void
}

export function TagPicker({ chosen, all, onToggle }: TagPickerProps) {
  const styles = useTagStyles()
  const [open, setOpen] = useState(false)
  const others = all.filter((tag) => !chosen.includes(tag))

  return (
    <div className="tag-chips">
      {chosen.map((tag) => {
        const style = tagStyleFor(styles, tag)
        return (
          <span
            key={tag}
            className="tag-chip"
            style={
              style
                ? ({ '--tag-bg': style.bgColor, '--tag-ink': style.textColor } as CSSProperties)
                : undefined
            }
          >
            {tag}
            <button
              type="button"
              className="tag-chip__remove"
              aria-label={`Retirer ${tag}`}
              onClick={() => onToggle(tag)}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        )
      })}
      <button
        type="button"
        className="tag-chip tag-chip--add"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Plus size={12} strokeWidth={2} />
        Ajouter
      </button>
      {open && (
        <div className="tag-chips__others">
          {others.map((tag) => (
            <button key={tag} type="button" className="tag" onClick={() => onToggle(tag)}>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
