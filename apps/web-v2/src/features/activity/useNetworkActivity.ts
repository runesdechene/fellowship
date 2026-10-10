/**
 * QUOI     — charge « Activité du réseau » de l'acteur actif : les quatre dernières nouvelles du
 *            fil de la communauté — arrivées, dates prises, abonnements, festivals ajoutés.
 * POURQUOI — une seule définition du réseau (lot 9a) : la barre latérale lit la même source que
 *            la page Communauté (community_feed), sans les avis, dont l'identité est protégée.
 */
import { useEffect, useState } from 'react'
import { activityText, readFeed } from '@/lib/community'
import type { Friend } from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'

const LIMIT = 4

export interface ActivityItem {
  id: string
  occurredAt: Date
  actor: Friend
  /** Ce qui suit le nom : « vient de rejoindre Fellowship », « va à Sylak »… */
  text: string
}

async function loadActivity(me: string): Promise<ActivityItem[]> {
  const lines = readFeed(must(await supabase.rpc('community_feed', { p_actor: me })))
  return lines
    .flatMap((line) => {
      const text = activityText(line)
      return text && line.who
        ? [
            {
              id: line.id,
              occurredAt: line.at,
              actor: { id: line.who.id, name: line.who.name, avatarUrl: line.who.avatarUrl },
              text,
            },
          ]
        : []
    })
    .slice(0, LIMIT)
}

export interface NetworkActivity {
  items: ActivityItem[]
  error: boolean
}

export function useNetworkActivity(actorId: string | null | undefined): NetworkActivity {
  const [state, setState] = useState<NetworkActivity>({ items: [], error: false })

  useEffect(() => {
    if (!actorId) return
    let cancelled = false

    async function run(me: string) {
      let next: NetworkActivity
      try {
        next = { items: await loadActivity(me), error: false }
      } catch {
        next = { items: [], error: true }
      }
      if (cancelled) return
      setState(next)
    }

    void run(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId])

  return state
}
