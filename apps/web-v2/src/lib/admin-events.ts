/**
 * QUOI     — l'état de la liste des événements de l'administration (recherche, page) lu et écrit dans
 *            l'adresse.
 * POURQUOI — tout état navigable est une URL (règle V2), comme la liste des comptes (admin-list.ts).
 */

export interface EventsQuery {
  q: string
  page: number
}

export function readEventsQuery(search: URLSearchParams): EventsQuery {
  const page = Math.max(0, Number.parseInt(search.get('page') ?? '0', 10) || 0)
  return { q: (search.get('q') ?? '').trim(), page }
}

export function writeEventsQuery(query: EventsQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.page > 0) params.set('page', String(query.page))
  return params
}
