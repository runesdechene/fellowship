/**
 * QUOI     — les catégories de l'Explorer : « Tout », puis chaque catégorie dans ses couleurs.
 * POURQUOI — les tags se montrent toujours en couleur (décision du 07/10/2026) ; choisir une
 *            catégorie filtre toutes les rangées et les résultats.
 * ATTENTION — les couleurs viennent de la base (table `tags`) : ce sont des DONNÉES, d'où le
 *            seul `style` du composant, en variables CSS.
 */
import type { CSSProperties } from 'react'
import type { TagRow } from '@/lib/tags'

interface CategoryChipsProps {
  tags: TagRow[]
  selected: string | null
  onSelect: (slug: string | null) => void
}

export function CategoryChips({ tags, selected, onSelect }: CategoryChipsProps) {
  return (
    <div className="category-chips" role="group" aria-label="Catégories">
      <button
        type="button"
        className="category-chip category-chip--all"
        aria-pressed={selected === null}
        onClick={() => {
          onSelect(null)
        }}
      >
        Tout
      </button>
      {tags.map((tag) => (
        <button
          key={tag.slug}
          type="button"
          className="category-chip"
          aria-pressed={selected === tag.slug}
          style={{ '--tag-bg': tag.bgColor, '--tag-ink': tag.textColor } as CSSProperties}
          onClick={() => {
            onSelect(selected === tag.slug ? null : tag.slug)
          }}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
