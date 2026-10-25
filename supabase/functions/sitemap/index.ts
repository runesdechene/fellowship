// sitemap : le plan du site pour les moteurs de recherche, servi à flw.sh/sitemap.xml (proxy
// Netlify). Les pages publiques fixes, puis chaque fiche et chaque vitrine, lues à chaque demande :
// une fiche créée ce matin y est ce soir, sans déploiement.
// Public (verify_jwt = false). Lu avec la clé anonyme, exprès : la RLS décide de ce qu'un visiteur
// voit, donc une fiche privée n'y paraît jamais.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP_URL } from '../_shared/app-url.ts'

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

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function allSlugs(table: 'events' | 'entities', column: 'slug' | 'public_slug'): Promise<string[]> {
  const slugs: string[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .not(column, 'is', null)
      .order(column)
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const row of data as Record<string, string>[]) slugs.push(row[column])
    if (data.length < PAGE) return slugs
  }
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

Deno.serve(async () => {
  try {
    const [events, vitrines] = await Promise.all([allSlugs('events', 'slug'), allSlugs('entities', 'public_slug')])
    const paths = [
      ...STATIC_PATHS,
      ...events.map((slug) => `/evenements/${encodeURIComponent(slug)}`),
      ...vitrines.map((slug) => `/${encodeURIComponent(slug)}`),
    ]
    const urls = paths.map((path) => `  <url><loc>${escapeXml(APP_URL + path)}</loc></url>`).join('\n')
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    })
  } catch (error) {
    console.error('[sitemap]', error)
    return new Response('sitemap indisponible', { status: 500 })
  }
})
