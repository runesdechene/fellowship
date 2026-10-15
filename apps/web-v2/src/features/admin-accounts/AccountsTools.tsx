/**
 * QUOI     — la recherche, les filtres (avec leur nombre), le tri affiché, et le pied de page
 *            « 1–50 sur 173 » du tableau.
 * POURQUOI — la recherche s'applique à l'adresse sur Entrée ou 300 ms après la dernière frappe ;
 *            le texte tapé reste local entre-temps pour ne pas recharger la liste à chaque lettre.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownUp, Search } from 'lucide-react'
import { Segmented } from '@/components/ui/Segmented'
import { filtersFor, PAGE_SIZE, type AccountsQuery } from '@/lib/admin-list'

const TYPING_DELAY = 300

interface ToolsProps {
  query: AccountsQuery
  /** Le nombre de comptes de chaque filtre ; absent pendant le chargement d'une autre vue. */
  counts: Map<string, number> | null
  onChange: (next: Partial<AccountsQuery>) => void
}

export function AccountsTools({ query, counts, onChange }: ToolsProps) {
  const [text, setText] = useState(query.q)
  const [seen, setSeen] = useState(query.q)
  // Retour arrière du navigateur : l'adresse change, le champ la suit — sauf si c'est lui qui l'a écrite.
  if (query.q !== seen) {
    setSeen(query.q)
    if (query.q !== text.trim()) setText(query.q)
  }

  useEffect(() => {
    if (text.trim() === query.q) return
    const timer = setTimeout(() => onChange({ q: text.trim() }), TYPING_DELAY)
    return () => clearTimeout(timer)
  }, [text, query.q, onChange])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (text.trim() !== query.q) onChange({ q: text.trim() })
  }

  const options = filtersFor(query.view).map(({ value, label }) => {
    const count = counts?.get(value)
    return { value, label: count === undefined ? label : `${label} · ${count}` }
  })

  return (
    <div className="admin-tools">
      <form className="admin-search" role="search" onSubmit={submit}>
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          className="admin-search__input"
          value={text}
          placeholder="Nom, enseigne, e-mail ou téléphone"
          aria-label="Nom, enseigne, e-mail ou téléphone"
          onChange={(event) => setText(event.target.value)}
        />
      </form>
      <Segmented
        label="Filtrer"
        options={options}
        value={query.filter}
        onChange={(filter) => onChange({ filter })}
      />
      <span className="admin-tools__sort">
        Les plus récents
        <ArrowDownUp size={14} strokeWidth={2} aria-hidden="true" />
      </span>
    </div>
  )
}

interface PagerProps {
  page: number
  shown: number
  total: number
  onPage: (page: number) => void
}

export function AccountsPager({ page, shown, total, onPage }: PagerProps) {
  if (total === 0) {
    return (
      <footer className="admin-pager">
        <span className="admin-pager__range">Aucun compte ne correspond.</span>
        {page > 0 && (
          <button type="button" className="admin-pager__button" onClick={() => onPage(0)}>
            Revenir au début
          </button>
        )}
      </footer>
    )
  }
  const first = page * PAGE_SIZE + 1
  return (
    <footer className="admin-pager">
      <span className="admin-pager__range">
        {first}–{first + shown - 1} sur {total}
      </span>
      {page > 0 && (
        <button type="button" className="admin-pager__button" onClick={() => onPage(page - 1)}>
          Précédents
        </button>
      )}
      {(page + 1) * PAGE_SIZE < total && (
        <button type="button" className="admin-pager__button" onClick={() => onPage(page + 1)}>
          Voir les suivants
        </button>
      )}
    </footer>
  )
}
