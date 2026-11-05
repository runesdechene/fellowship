/**
 * QUOI     — charge « Activité de la plateforme » : les quatre dernières nouvelles de tout le
 *            monde — arrivées, dates publiques, festivals ajoutés — et les visites des amis.
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
  // Une visite ne dit rien de plus qu'un geste : qui a agi n'apparaît pas pour être passé.
  const acted = new Set(
    lines.flatMap((line) => (line.who && line.kind !== 'visit' ? [line.who.id] : [])),
  )
  // Le fil arrive du plus récent au plus ancien : on garde la première ligne de chacun.
  const seen = new Set<string>()
  return lines
    .flatMap((line) => {
      const text = activityText(line)
      if (!text || !line.who || seen.has(line.who.id)) return []
      if (line.kind === 'visit' && acted.has(line.who.id)) return []
      seen.add(line.who.id)
      return [{ id: line.id, occurredAt: line.at, actor: line.who, text }]
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
