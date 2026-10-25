/**
 * QUOI     — flw.sh/sitemap.xml : le plan du site pour les moteurs de recherche. Les pages publiques
 *            fixes, puis chaque fiche et chaque vitrine, lues en base à chaque demande.
 * POURQUOI — une fiche créée le matin y figure le soir, sans déploiement. Fonction Netlify et non
 *            Supabase : Supabase rend ses fonctions en text/plain à certains clients, et Netlify
 *            n'applique pas ses en-têtes à une réponse relayée.
 * ATTENTION — lue avec la clé anonyme, exprès : la RLS décide de ce qu'un visiteur voit, donc une
 *            fiche privée n'y paraît jamais. Variables : celles du build (VITE_SUPABASE_*).
 */
const SITE = 'https://flw.sh'
const STATIC_PATHS = [
  '/',
  '/festivals',
  '/legal/mentions-legales',
  '/legal/confidentialite',
  '/legal/cgu',
  '/legal/cgv',
  '/legal/charte-communautaire',
]
// La base rend au plus 1 000 lignes par requête : on lit par pages.
const PAGE = 1000

async function allSlugs(table, column) {
  const key = process.env.VITE_SUPABASE_ANON_KEY
  const slugs = []
  for (let offset = 0; ; offset += PAGE) {
    const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/${table}?select=${column}&${column}=not.is.null&order=${column}&limit=${PAGE}&offset=${offset}`
    const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!response.ok) throw new Error(`${table} : ${response.status} ${await response.text()}`)
    const rows = await response.json()
    slugs.push(...rows.map((row) => row[column]))
    if (rows.length < PAGE) return slugs
  }
}

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default async () => {
  try {
    const [events, vitrines] = await Promise.all([
      allSlugs('events', 'slug'),
      allSlugs('entities', 'public_slug'),
    ])
    const paths = [
      ...STATIC_PATHS,
      ...events.map((slug) => `/evenements/${encodeURIComponent(slug)}`),
      ...vitrines.map((slug) => `/${encodeURIComponent(slug)}`),
    ]
    const urls = paths.map((path) => `  <url><loc>${escapeXml(SITE + path)}</loc></url>`).join('\n')
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[sitemap]', error)
    return new Response('Plan du site indisponible', { status: 500 })
  }
}

export const config = { path: '/sitemap.xml' }
