/**
 * QUOI     — la requête des exposants trouvés par des mots (nom, ville, métier) et un lieu : leurs
 *            vitrines publiques, sans l'acteur qui cherche.
 * POURQUOI — Explorer et la recherche plein écran cherchent les exposants pareil : une seule
 *            requête, que chacun trie et borne.
 */
import { supabase } from './supabase'

export function exhibitorsQuery(words: string | null, place: string | null, viewerId: string) {
  let query = supabase
    .from('entities')
    .select('actor_id, public_slug, brand_name, avatar_url, craft_type, city, department')
    .not('public_slug', 'is', null)
    .neq('actor_id', viewerId)
  if (words)
    query = query.or(`brand_name.ilike.${words},city.ilike.${words},craft_type.ilike.${words}`)
  if (place) query = query.or(`city.ilike.${place},department.ilike.${place}`)
  return query
}
