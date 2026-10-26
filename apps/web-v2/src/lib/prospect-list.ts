/**
 * QUOI     — l'état de la liste des prospects (recherche, filtre, source, suiveur, balise, réseau, page) lu et écrit dans
 *            l'adresse.
 * POURQUOI — tout état navigable est une URL (règle V2).
 * ATTENTION — les valeurs de filtre sont celles qu'attend admin_prospects (SQL).
 */
export type ProspectFilter =
  'tous' | 'a_contacter' | 'contactes' | 'repondu' | 'a_repondre' | 'compte' | 'a_relancer'

export interface ProspectsQuery {
  q: string
  filter: ProspectFilter
  source: string
  /** '' = tous, 'moi', ou l'identifiant d'un suiveur. */
  suivi: string
  /** '' = toutes, sinon une balise écrite dans les notes (#Orga), casse ignorée. */
  balise: string
  /** '' = tous, sinon le domaine d'un réseau (`host` de lib/social.ts). */
  reseau: string
  page: number
}

export const PROSPECT_FILTERS: readonly { value: ProspectFilter; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'a_contacter', label: 'À contacter' },
  { value: 'contactes', label: 'Contactés' },
  { value: 'repondu', label: 'Ont répondu' },
  { value: 'a_repondre', label: 'À répondre' },
  { value: 'compte', label: 'Ont un compte' },
  { value: 'a_relancer', label: 'À relancer' },
]

function isFilter(value: string): value is ProspectFilter {
  return PROSPECT_FILTERS.some((filter) => filter.value === value)
}

export function readProspectsQuery(search: URLSearchParams): ProspectsQuery {
  const raw = search.get('filtre') ?? ''
  return {
    q: (search.get('q') ?? '').trim(),
    filter: isFilter(raw) ? raw : 'tous',
    source: search.get('source') ?? '',
    suivi: search.get('suivi') ?? '',
    balise: search.get('balise') ?? '',
    reseau: search.get('reseau') ?? '',
    page: Math.max(0, Number.parseInt(search.get('page') ?? '0', 10) || 0),
  }
}

export function writeProspectsQuery(query: ProspectsQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.filter !== 'tous') params.set('filtre', query.filter)
  if (query.source) params.set('source', query.source)
  if (query.suivi) params.set('suivi', query.suivi)
  if (query.balise) params.set('balise', query.balise)
  if (query.reseau) params.set('reseau', query.reseau)
  if (query.page > 0) params.set('page', String(query.page))
  return params
}
