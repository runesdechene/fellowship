/**
 * QUOI     — le pied d'une liste de l'administration : « 1–50 sur 173 », Précédents, Voir les suivants.
 * POURQUOI — les listes (Comptes, Prospects) se lisent par pages de 50, tenues dans l'adresse.
 */
import { PAGE_SIZE } from '@/lib/admin-list'

interface Props {
  page: number
  shown: number
  total: number
  onPage: (page: number) => void
  /** Le texte d'une liste vide : « Aucun compte ne correspond. » */
  empty: string
  /** Centré sous la liste (les Prospects) ; calé à gauche sinon. */
  centered?: boolean
}

export function AdminPager({ page, shown, total, onPage, empty, centered = false }: Props) {
  const className = centered ? 'admin-pager admin-pager--centered' : 'admin-pager'
  if (total === 0) {
    return (
      <footer className={className}>
        <span className="admin-pager__range">{empty}</span>
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
    <footer className={className}>
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
