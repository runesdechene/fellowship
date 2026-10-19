/**
 * QUOI     — la pastille des Nouveautés : une mise à jour plus récente que la dernière visite de la
 *            page. Relue à chaque changement d'adresse ; éteinte sur /nouveautes.
 * POURQUOI — la ligne de version (barre latérale) et l'onglet « Moi » (téléphone) la montrent ;
 *            AppShell la lit une fois pour les deux, comme les demandes d'ami.
 * ATTENTION — une lecture ratée laisse la pastille éteinte : c'est un signe discret, pas une donnée.
 */
import { useEffect, useState } from 'react'
import { isUnread } from '@/lib/app-updates'
import { supabase } from '@/lib/supabase'

export function useUpdatesUnread(pathname: string, personId: string | undefined): boolean {
  const [unread, setUnread] = useState(false)
  const onPage = pathname === '/nouveautes'

  useEffect(() => {
    if (!personId || onPage) return
    const person = personId
    let cancelled = false
    async function run() {
      const [latest, seen] = await Promise.all([
        supabase
          .from('app_updates')
          .select('published_at')
          .order('published_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('users').select('updates_seen_at').eq('actor_id', person).maybeSingle(),
      ])
      if (cancelled) return
      setUnread(isUnread(latest.data?.published_at ?? null, seen.data?.updates_seen_at ?? null))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [pathname, personId, onPage])

  return unread && !onPage
}
