/**
 * QUOI     — la recherche, les filtres (avec leur nombre) et le tri affiché de la liste des comptes.
 * POURQUOI — la recherche est la brique partagée de l'administration (AdminSearch) ; les filtres
 *            dépendent de la vue (enseignes ou personnes).
 */
import { ArrowDownUp } from 'lucide-react'
import { AdminSearch } from '@/components/ui/AdminSearch'
import { Segmented } from '@/components/ui/Segmented'
import { filtersFor, type AccountsQuery } from '@/lib/admin-list'

interface ToolsProps {
  query: AccountsQuery
  /** Le nombre de comptes de chaque filtre ; absent pendant le chargement d'une autre vue. */
  counts: Map<string, number> | null
  onChange: (next: Partial<AccountsQuery>) => void
}

export function AccountsTools({ query, counts, onChange }: ToolsProps) {
  const options = filtersFor(query.view).map(({ value, label }) => {
    const count = counts?.get(value)
    return { value, label: count === undefined ? label : `${label} · ${count}` }
  })

  return (
    <div className="admin-tools">
      <AdminSearch
        value={query.q}
        placeholder="Nom, enseigne, e-mail ou téléphone"
        onSearch={(q) => onChange({ q })}
      />
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
