/**
 * QUOI     — l'état de la liste des comptes (vue, recherche, filtre, page) lu et écrit dans l'adresse.
 * POURQUOI — tout état navigable est une URL (règle V2) : une recherche se partage, le retour
 *            arrière la retrouve.
 * ATTENTION — les valeurs de filtre sont celles qu'attendent admin_enseignes / admin_personnes (SQL).
 */
export type AccountsView = 'enseignes' | 'personnes'

export interface AccountsQuery {
  view: AccountsView
  q: string
  filter: string
  page: number
}

export const PAGE_SIZE = 50

const FILTERS: Record<AccountsView, readonly { value: string; label: string }[]> = {
  enseignes: [
    { value: 'toutes', label: 'Toutes' },
    { value: 'pro', label: 'Pro' },
    { value: 'essai', label: 'Essai' },
    { value: 'gratuit', label: 'Gratuit' },
    { value: 'exposants', label: 'Exposants' },
    { value: 'festivals', label: 'Festivals' },
  ],
  personnes: [
    { value: 'tous', label: 'Tous' },
    { value: 'pro', label: 'Pro' },
    { value: 'essai', label: 'Essai' },
    { value: 'gratuit', label: 'Gratuit' },
    { value: 'sans_enseigne', label: 'Sans enseigne' },
    { value: 'admins', label: 'Admins' },
  ],
}

const DEFAULT_FILTER: Record<AccountsView, string> = { enseignes: 'toutes', personnes: 'tous' }

export function defaultFilter(view: AccountsView): string {
  return DEFAULT_FILTER[view]
}

export function filtersFor(view: AccountsView): readonly { value: string; label: string }[] {
  return FILTERS[view]
}

export function readAccountsQuery(search: URLSearchParams): AccountsQuery {
  const view: AccountsView = search.get('vue') === 'personnes' ? 'personnes' : 'enseignes'
  const raw = search.get('filtre') ?? ''
  const filter = FILTERS[view].some((f) => f.value === raw) ? raw : DEFAULT_FILTER[view]
  const page = Math.max(0, Number.parseInt(search.get('page') ?? '0', 10) || 0)
  return { view, q: (search.get('q') ?? '').trim(), filter, page }
}

export function writeAccountsQuery(query: AccountsQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.view === 'personnes') params.set('vue', 'personnes')
  if (query.q) params.set('q', query.q)
  if (query.filter !== DEFAULT_FILTER[query.view]) params.set('filtre', query.filter)
  if (query.page > 0) params.set('page', String(query.page))
  return params
}
