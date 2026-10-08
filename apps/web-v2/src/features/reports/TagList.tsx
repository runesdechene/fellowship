/**
 * QUOI     — une liste d'étiquettes d'un bilan (« Ce qui a marché », « À améliorer la prochaine
 *            fois ») : une croix pour retirer, « Ajouter » pour en écrire une.
 * POURQUOI — des mots courts se relisent d'un coup d'œil l'année suivante, mieux qu'un paragraphe.
 * ATTENTION — la liste n'envoie que le geste (ajouter tel mot, retirer telle étiquette) : la
 *            nouvelle liste se calcule sur ce que la base garde (reportActions.changeTags), pour
 *            que deux gestes rapprochés ne s'écrasent pas.
 */
import { Plus, X } from 'lucide-react'
import { useState } from 'react'

interface TagListProps {
  title: string
  tags: string[]
  onAdd: (raw: string) => void
  onRemove: (tag: string) => void
}

export function TagList({ title, tags, onAdd, onRemove }: TagListProps) {
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState('')

  function commit() {
    if (draft.trim() !== '') onAdd(draft)
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
                onRemove(tag)
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
