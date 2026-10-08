/**
 * QUOI     — une liste d'étiquettes d'un bilan (« Ce qui a marché », « À améliorer la prochaine
 *            fois ») : une croix pour retirer, « Ajouter » pour en écrire une.
 * POURQUOI — des mots courts se relisent d'un coup d'œil l'année suivante, mieux qu'un paragraphe.
 * ATTENTION — l'ajout passe par addTag (lib/report-writes.ts) : le vide et les doublons ne
 *            changent rien, et rien n'est envoyé.
 */
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { addTag } from '@/lib/report-writes'

interface TagListProps {
  title: string
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagList({ title, tags, onChange }: TagListProps) {
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState('')

  function commit() {
    const next = addTag(tags, draft)
    if (next !== tags) onChange(next)
    setDraft('')
    setWriting(false)
  }

  return (
    <section className="report-block">
      <h2 className="report-block__title">{title}</h2>
      <div className="tag-list">
        {tags.map((tag) => (
          <span key={tag} className="tag-list__tag">
            {tag}
            <button
              type="button"
              className="tag-list__remove"
              aria-label={`Retirer « ${tag} »`}
              onClick={() => {
                onChange(tags.filter((t) => t !== tag))
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        ))}
        {writing ? (
          <input
            className="tag-list__input"
            aria-label={`Nouvelle étiquette — ${title}`}
            autoFocus
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit()
              if (event.key === 'Escape') {
                setDraft('')
                setWriting(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="tag-list__add"
            onClick={() => {
              setWriting(true)
            }}
          >
            <Plus size={12} strokeWidth={2} />
            Ajouter
          </button>
        )}
      </div>
    </section>
  )
}
