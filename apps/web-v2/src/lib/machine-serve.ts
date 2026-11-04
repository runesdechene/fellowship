/**
 * QUOI     — la réponse des fonctions Netlify qui servent aux IA une fiche lisible sans
 *            JavaScript (`netlify/functions/event-page.mts`).
 * POURQUOI — lue en base à chaque demande, comme `sitemap.mjs` : une fiche corrigée le matin est
 *            juste le soir, sans déploiement.
 * ATTENTION — lecture avec la clé anonyme, exprès : la RLS décide de ce qu'un visiteur voit, donc
 *            une fiche privée ne sort jamais. Quoi qu'il arrive en base, on rend l'application
 *            (sa coque `index.html`) : les humains passent par la même adresse.
 */
import { eventPage, injectPage, type MachineEvent } from './machine-page'
import type { SelectionEvent } from './selection'

export type BaseEnv = { url: string; key: string }
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type Stats = Pick<SelectionEvent, 'interested' | 'registered' | 'rating' | 'rating_count'>

const EVENT_COLUMNS = [
  'id',
  'slug',
  'name',
  'city',
  'department',
  'country',
  'start_date',
  'end_date',
  'registration_deadline',
  'registration_url',
  'stand_price',
  'stand_size',
  'image_url',
  'expected_attendance',
  'edition',
  'tags',
  'description',
  'address',
  'latitude',
  'longitude',
].join(',')

const NO_STATS: Stats = { interested: 0, registered: 0, rating: null, rating_count: 0 }

// Netlify ne pose pas les [[headers]] de netlify.toml sur la réponse d'une fonction : on reprend
// ceux de la coque, qui les a reçus.
const SHELL_HEADERS = ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy']

function html(body: string, shell: Headers): Response {
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    // Le navigateur revalide : il garderait sinon un HTML qui pointe vers un ancien index-*.js,
    // disparu au déploiement suivant. Le CDN, lui, est vidé à chaque déploiement.
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Netlify-CDN-Cache-Control': 'public, max-age=3600',
  })
  for (const name of SHELL_HEADERS) {
    const value = shell.get(name)
    if (value) headers.set(name, value)
  }
  return new Response(body, { headers })
}

async function readRows<T>(fetcher: Fetcher, env: BaseEnv, path: string): Promise<T[]> {
  const response = await fetcher(`${env.url}/rest/v1/${path}`, {
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
  })
  if (!response.ok) throw new Error(`${path} : ${String(response.status)} ${await response.text()}`)
  return (await response.json()) as T[]
}

export async function serveEventPage(
  request: Request,
  slug: string,
  env: BaseEnv,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  // La coque publiée du site, pas la fonction elle-même : `/index.html` est un fichier statique.
  const shell = await fetcher(new URL('/index.html', request.url))
  const index = await shell.text()
  try {
    const slugFilter = `slug=eq.${encodeURIComponent(slug)}`
    const [row] = await readRows<Omit<MachineEvent, keyof Stats>>(
      fetcher,
      env,
      `events?select=${EVENT_COLUMNS}&${slugFilter}&order=id&limit=1`,
    )
    if (!row) return html(index, shell.headers)
    const [stats] = await readRows<Stats>(
      fetcher,
      env,
      `rpc/event_public_stats?event_id=eq.${row.id}&select=interested,registered,rating,rating_count`,
    )
    return html(injectPage(index, eventPage({ ...row, ...(stats ?? NO_STATS) })), shell.headers)
  } catch (error) {
    // eslint-disable-next-line no-console -- journal de la fonction Netlify, seule trace d'une panne
    console.error('[event-page]', error)
    return html(index, shell.headers)
  }
}
