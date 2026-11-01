/**
 * QUOI     — charge « Activité de la plateforme » : les quatre dernières nouvelles de tout le
 *            monde — arrivées, dates publiques, festivals ajoutés.
 * POURQUOI — la même source que « Toute la plateforme » dans Ma communauté
 *            (community_feed, portée « plateforme »), sans les avis, dont l'identité est protégée.
 */
import { useEffect, useState } from 'react'
import { activityText, readFeed, type ActivityText, type FeedPerson } from '@/lib/community'
import { must, supabase } from '@/lib/supabase'

const LIMIT = 4

export interface ActivityItem {
  id: string
  occurredAt: Date
  actor: FeedPerson
  /** Ce qui suit le nom : « vient de rejoindre Fellowship », « va à Sylak »… */
  text: ActivityText
}

async function loadActivity(me: string): Promise<ActivityItem[]> {
  const lines = readFeed(
    must(await supabase.rpc('community_feed', { p_actor: me, p_scope: 'plateforme' })),
  )
  return lines
    .flatMap((line) => {
      const text = activityText(line)
      return text && line.who
        ? [
            {
              id: line.id,
              occurredAt: line.at,
              actor: line.who,
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
