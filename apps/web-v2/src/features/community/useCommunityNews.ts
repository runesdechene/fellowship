/**
 * QUOI     — les nouvelles de « Ma communauté » pour sa pastille : les lignes du fil de ses amis
 *            (avis, dates, candidatures, festivals ajoutés, abonnements) arrivées depuis la dernière
 *            ouverture de la page (users.community_seen_at). Ouvrir /communaute remet le compte à
 *            zéro. Relu à chaque changement d'adresse.
 * POURQUOI — Communauté annonce l'actu des amis (Uriel, 10/11/2026) ; les nouveaux festivals sont
 *            passés à Explorer. Le compte part du fil lui-même (community_feed, portée « réseau ») :
 *            la pastille annonce exactement ce que la page montre. L'instant vit sur la personne.
 * ATTENTION — une lecture ratée laisse la pastille éteinte : c'est un signe discret, pas une donnée.
 */
import { useEffect, useState } from 'react'
import { countSince, readFeed } from '@/lib/community'
import { supabase } from '@/lib/supabase'

/** Au-delà, la pastille dit « 9+ » : dix lignes suffisent. */
const ENOUGH = 10

export function useCommunityNews(
  pathname: string,
  personId: string | undefined,
  actorId: string | undefined,
): number {
  const [count, setCount] = useState(0)
  const onPage = pathname === '/communaute'

  useEffect(() => {
    if (!personId || !actorId) return
    const person = personId
    const actor = actorId
    let cancelled = false
    async function run() {
      if (onPage) {
        // La requête ne part qu'attendue : un `void supabase.from(…).update(…)` seul n'envoie rien.
        await supabase
          .from('users')
          .update({ community_seen_at: new Date().toISOString() })
          .eq('actor_id', person)
        return
      }
      const [seen, feed] = await Promise.all([
        supabase.from('users').select('community_seen_at').eq('actor_id', person).maybeSingle(),
        supabase.rpc('community_feed', { p_actor: actor, p_limit: ENOUGH, p_scope: 'reseau' }),
      ])
      if (cancelled || !seen.data || feed.error) return
      setCount(countSince(readFeed(feed.data), new Date(seen.data.community_seen_at)))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [pathname, personId, actorId, onPage])

  return onPage ? 0 : count
}
