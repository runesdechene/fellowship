/**
 * QUOI     — flw.sh/evenements/:slug servie lisible sans JavaScript : la coque de l'application,
 *            avec la tête de page, le JSON-LD et le texte de la fiche. React la remplace au montage.
 * POURQUOI — les agents IA n'exécutent pas le JavaScript ; sans ça ils lisent une page vide.
 *            Toute la logique, testée, vit dans src/lib/machine-serve.ts.
 * ATTENTION — un seul segment : /evenements/nouveau, /…/modifier, /…/avis ne passent pas ici
 *            (« nouveau » n'est pas un slug : la coque revient intacte). Variables : celles du
 *            build (VITE_SUPABASE_*), comme sitemap.mjs.
 */
import { serveEventPage } from '../../src/lib/machine-serve'

type Context = { params: Record<string, string> }

export default (request: Request, context: Context) =>
  serveEventPage(request, context.params.slug ?? '', {
    url: process.env.VITE_SUPABASE_URL ?? '',
    key: process.env.VITE_SUPABASE_ANON_KEY ?? '',
  })

export const config = { path: '/evenements/:slug' }
