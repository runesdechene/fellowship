/**
 * QUOI     — les nouvelles de « Ma communauté » pour sa pastille : les lignes du fil de ses
 *            abonnements (avis, dates, candidatures, festivals ajoutés, abonnements) arrivées
 *            depuis la dernière ouverture de la page (users.community_seen_at, remis à jour par
 *            useCommunity). Relu à chaque changement d'adresse.
 * POURQUOI — Communauté annonce l'actu de ses abonnements (Uriel, 10/11/2026) ; les visites n'en
 *            sont pas, elles vivent dans « Activité de la plateforme » (11/11/2026). Le compte part
 *            du fil lui-même (community_feed, portée « réseau ») : la pastille annonce exactement ce
 *            que la page marque nouveau.
 * ATTENTION — une lecture ratée laisse la pastille éteinte : c'est un signe discret, pas une donnée.
 */
import { useEffect, useState } from 'react'
import { countSince, readFeed } from '@/lib/community'
import { supabase } from '@/lib/supabase'

/** Assez de lignes pour que les visites, lues puis écartées, ne cachent pas les vraies nouvelles. */
const ENOUGH = 40

export function useCommunityNews(
  pathname: string,
  personId: string | undefined,
  actorId: string | undefined,
): number {
  const [count, setCount] = useState(0)
  const onPage = pathname === '/communaute'

  useEffect(() => {
    if (!personId || !actorId || onPage) return
    const person = personId
    const actor = actorId
    let cancelled = false
    async function run() {
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
