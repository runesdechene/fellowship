/**
 * QUOI     — les catégories de l'Explorer : « Tout », les catégories retenues dans leurs couleurs,
 *            puis le menu « Sélectionner un filtre » qui en ajoute une.
 * POURQUOI — les tags se montrent toujours en couleur (décision du 07/10/2026) ; ils seront trop
 *            nombreux pour tous tenir sur la page, d'où le menu (Uriel, 19/10/2026). Plusieurs
 *            catégories se cumulent : une date en porte au moins une.
 * ATTENTION — les couleurs viennent de la base (table `tags`) : ce sont des DONNÉES, d'où le
 *            seul `style` du composant, en variables CSS.
 */
import { X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Select } from '@/components/ui/Select'
import type { TagRow } from '@/lib/tags'

interface CategoryChipsProps {
  tags: TagRow[]
  selected: string[]
  onChange: (slugs: string[]) => void
}

export function CategoryChips({ tags, selected, onChange }: CategoryChipsProps) {
  const chosen = tags.filter((tag) => selected.includes(tag.slug))
  const others = tags.filter((tag) => !selected.includes(tag.slug))

  return (
    <div className="category-chips" role="group" aria-label="Catégories">
      <button
        type="button"
        className="category-chip category-chip--all"
        aria-pressed={selected.length === 0}
        onClick={() => {
          onChange([])
        }}
      >
        Tout
      </button>
      {chosen.map((tag) => (
        <button
          key={tag.slug}
          type="button"
          className="category-chip category-chip--chosen"
          aria-label={`Retirer le filtre ${tag.name}`}
          style={{ '--tag-bg': tag.bgColor, '--tag-ink': tag.textColor } as CSSProperties}
          onClick={() => {
            onChange(selected.filter((slug) => slug !== tag.slug))
          }}
        >
          {tag.name}
          <X size={12} strokeWidth={2.2} aria-hidden="true" />
        </button>
      ))}
      {others.length > 0 && (
        <Select
          label="Ajouter un filtre"
          placeholder="Sélectionner un filtre"
          className="category-select"
          value={null}
          options={others.map((tag) => ({
            value: tag.slug,
            label: tag.name,
            swatch: { bg: tag.bgColor, ink: tag.textColor },
          }))}
          onChange={(slug: string | null) => {
            if (slug) onChange([...selected, slug])
          }}
        />
      )}
    </div>
  )
}
