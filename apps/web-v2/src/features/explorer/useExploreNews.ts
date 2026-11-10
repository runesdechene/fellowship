/**
 * QUOI     — la pastille d'Explorer : les festivals publics ajoutés par les autres depuis la
 *            dernière ouverture d'Explorer (users.explore_seen_at). Ouvrir /explorer remet le compte
 *            à zéro. Relu à chaque changement d'adresse.
 * POURQUOI — Explorer annonce les festivals à découvrir (Uriel, 10/11/2026). L'instant vit sur la
 *            personne : ouvrir Explorer sur le téléphone l'éteint partout.
 * ATTENTION — une lecture ratée laisse la pastille éteinte : c'est un signe discret, pas une donnée.
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useExploreNews(
  pathname: string,
  personId: string | undefined,
  myActorIds: string[],
): number {
  const [count, setCount] = useState(0)
  const onPage = pathname === '/explorer'
  const mine = myActorIds.join(',')

  useEffect(() => {
    if (!personId) return
    const person = personId
    let cancelled = false
    async function run() {
      if (onPage) {
        // La requête ne part qu'attendue : un `void supabase.from(…).update(…)` seul n'envoie rien.
        await supabase
          .from('users')
          .update({ explore_seen_at: new Date().toISOString() })
          .eq('actor_id', person)
        return
      }
      const seen = await supabase
        .from('users')
        .select('explore_seen_at')
        .eq('actor_id', person)
        .maybeSingle()
      if (!seen.data) return
      // Un festival sans auteur (import de l'administration) compte aussi.
      const news = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('is_private', false)
        .gt('created_at', seen.data.explore_seen_at)
        .or(`created_by_actor.is.null,created_by_actor.not.in.(${mine})`)
      if (cancelled) return
      setCount(news.count ?? 0)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [pathname, personId, onPage, mine])

  return onPage ? 0 : count
}
