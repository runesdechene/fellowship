/**
 * QUOI     — tests de lib/machine-serve.ts : la réponse des fonctions Netlify qui servent une
 *            fiche lisible par les IA.
 * POURQUOI — quoi qu'il arrive en base, la fonction doit rendre l'application : une 500 sur
 *            /evenements/… couperait la fiche aux humains aussi.
 */
import { serveEventPage } from './machine-serve'

const INDEX =
  '<html><head><meta name="description" content="x" /><title>Fellowship</title></head><body><div id="root"></div></body></html>'
const SHELL_HEADERS = {
  'Content-Security-Policy': "default-src 'self'",
  'Permissions-Policy': 'camera=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  Etag: '"coque"',
}
const ENV = { url: 'https://base.test', key: 'cle-anonyme' }
const REQUEST = new Request('https://flw.sh/evenements/fete-2027')

const ROW = {
  id: 'e1',
  slug: 'fete-2027',
  name: 'Fête des lutins',
  city: 'Albi',
  department: '81',
  country: 'FR',
  start_date: '2027-05-01',
  end_date: '2027-05-02',
  registration_deadline: null,
  registration_url: null,
  stand_price: null,
  stand_size: null,
  image_url: null,
  expected_attendance: null,
  edition: null,
  tags: ['fete-medievale'],
  description: null,
  address: null,
  latitude: null,
  longitude: null,
}

/** Un faux réseau : la coque, la fiche et ses totaux, selon l'adresse demandée. */
function network(rows: unknown[], options: { failBase?: boolean; failShell?: boolean } = {}) {
  const seen: string[] = []
  const fetcher = (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input)
    seen.push(url)
    if (url === 'https://flw.sh/index.html' && options.failShell)
      return Promise.resolve(new Response('erreur', { status: 503 }))
    if (url === 'https://flw.sh/index.html')
      return Promise.resolve(new Response(INDEX, { headers: SHELL_HEADERS }))
    if (options.failBase) return Promise.reject(new Error('réseau coupé'))
    if (url.includes('/rest/v1/events')) return Promise.resolve(Response.json(rows))
    if (url.includes('/rpc/event_public_stats'))
      return Promise.resolve(
        Response.json([
          { event_id: 'e1', interested: 4, registered: 1, rating: null, rating_count: 0 },
        ]),
      )
    return Promise.resolve(new Response('inconnu', { status: 404 }))
  }
  return { fetcher, seen }
}

describe('serveEventPage', () => {
  it('sert la fiche lisible, avec son JSON-LD et ses totaux', async () => {
    const { fetcher } = network([ROW])
    const response = await serveEventPage(REQUEST, 'fete-2027', ENV, fetcher)
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    // Le CDN garde la page une heure (chaque déploiement le vide) ; le navigateur revalide, sinon
    // il garderait un HTML qui pointe vers un ancien index-*.js disparu au déploiement suivant.
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
    // Cinq minutes au CDN : une fiche passée en privée n'y reste pas plus longtemps.
    expect(response.headers.get('Netlify-CDN-Cache-Control')).toBe('public, max-age=300')
    expect(html).toContain('<h1>Fête des lutins 2027</h1>')
    expect(html).toContain('application/ld+json')
    expect(html).toContain('5 exposants intéressés')
  })

  it('garde les en-têtes de sécurité de la coque, que Netlify ne pose pas sur une fonction', async () => {
    for (const rows of [[ROW], []]) {
      const { fetcher } = network(rows)
      const response = await serveEventPage(REQUEST, 'fete-2027', ENV, fetcher)
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
      expect(response.headers.get('Permissions-Policy')).toBe('camera=()')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('Etag')).toBeNull()
    }
  })

  it('lit la base avec la clé anonyme, pour que la RLS cache les fiches privées', async () => {
    const { fetcher, seen } = network([ROW])
    await serveEventPage(REQUEST, 'fete-2027', ENV, fetcher)
    expect(seen.some((url) => url.includes('slug=eq.fete-2027'))).toBe(true)
  })

  it('rend la coque intacte pour une fiche inconnue ou privée', async () => {
    const { fetcher } = network([])
    const response = await serveEventPage(REQUEST, 'fete-2027', ENV, fetcher)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(INDEX)
  })

  it('ne met pas en cache une coque servie sans fiche', async () => {
    for (const options of [{}, { failBase: true }]) {
      const { fetcher } = network([], options)
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const response = await serveEventPage(REQUEST, 'fete-2027', ENV, fetcher)
      error.mockRestore()
      expect(response.headers.get('Netlify-CDN-Cache-Control')).toBeNull()
    }
  })

  it('répond 502 sans cache quand la coque ne vient pas', async () => {
    const { fetcher } = network([ROW], { failShell: true })
    const response = await serveEventPage(REQUEST, 'fete-2027', ENV, fetcher)
    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('rend la coque intacte quand la base ne répond pas', async () => {
    const { fetcher } = network([ROW], { failBase: true })
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await serveEventPage(REQUEST, 'fete-2027', ENV, fetcher)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(INDEX)
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
