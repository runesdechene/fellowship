/**
 * QUOI     — la liste des comptes de l'administration : en-tête et bascule Enseignes / Personnes,
 *            quatre chiffres, recherche et filtres, tableau paginé (maquettes 2338:2 et 2340:2).
 * POURQUOI — c'est l'enseigne qu'on regarde le plus (Uriel, 15/10/2026) : vue par défaut.
 */
import { useSearchParams } from 'react-router-dom'
import { Segmented } from '@/components/ui/Segmented'
import {
  readAccountsQuery,
  writeAccountsQuery,
  type AccountsQuery,
  type AccountsView,
} from '@/lib/admin-list'
import { AccountsStats } from './AccountsStats'
import { AccountsPager, AccountsTools } from './AccountsTools'
import { EntitiesTable } from './EntitiesTable'
import { PeopleTable } from './PeopleTable'
import { useAccounts } from './useAccounts'

export function AccountsPage() {
  const [search, setSearch] = useSearchParams()
  const query = readAccountsQuery(search)
  const { data, error } = useAccounts(query)
  const go = (next: Partial<AccountsQuery>) =>
    setSearch(writeAccountsQuery({ ...query, page: 0, ...next }))
  const switchView = (view: AccountsView) =>
    setSearch(
      writeAccountsQuery({
        view,
        q: query.q,
        filter: view === 'personnes' ? 'tous' : 'toutes',
        page: 0,
      }),
    )

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Comptes</h1>
          <p className="admin-page__lede">
            {query.view === 'enseignes'
              ? 'Les enseignes, leur offre et les comptes qui les tiennent.'
              : 'Les personnes et leurs enseignes. Cherche, ouvre une fiche, corrige.'}
          </p>
        </div>
        <Segmented
          label="Lire par"
          options={[
            { value: 'enseignes', label: 'Enseignes' },
            { value: 'personnes', label: 'Personnes' },
          ]}
          value={query.view}
          onChange={switchView}
        />
      </header>
      {data?.stats && <AccountsStats stats={data.stats} />}
      <AccountsTools
        key={query.view}
        query={query}
        counts={data?.view === query.view ? data.counts : null}
        onChange={go}
      />
      {error && <p className="admin-page__error">{error}</p>}
      {data?.view === 'enseignes' && <EntitiesTable rows={data.rows} members={data.members} />}
      {data?.view === 'personnes' && <PeopleTable rows={data.rows} />}
      {data && (
        <AccountsPager
          page={query.page}
          shown={data.rows.length}
          total={data.total}
          onPage={(page) => go({ page })}
        />
      )}
    </div>
  )
}
