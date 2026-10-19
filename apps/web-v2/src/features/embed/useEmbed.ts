/**
 * QUOI     — charge l'enseigne d'un calendrier intégré et ses dates publiques à venir.
 * POURQUOI — `/:slug/embed` se lit sans compte, sur le site d'un artiste (lot 12).
 * ATTENTION — mêmes dates que la V1 : participations publiques, « inscrit » ou « confirmé ».
 *            Une lecture ratée se dit, elle ne passe jamais pour « aucune date » (rules/v2.md).
 */
import { useEffect, useState } from 'react'
import { parseSqlDate, todayIso } from '@/lib/dates'
import { upcomingEmbedDates } from '@/lib/embed'
import { CONFIRMED_STATUSES } from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'
import { fetchTags, tagStylesByName, type TagStyle } from '@/lib/tags'

export interface EmbedEntity {
  name: string
  craft: string | null
  city: string | null
  avatarUrl: string | null
}

export interface EmbedDate {
  id: string
  name: string
  start_date: string
  end_date: string
  city: string
  department: string | null
  tags: string[] | null
  image_url: string | null
  is_private: boolean
}

export type EmbedState =
  | { kind: 'loading' }
  | { kind: 'missing' | 'failed' }
  | { kind: 'ready'; entity: EmbedEntity; dates: EmbedDate[]; tagStyles: Map<string, TagStyle> }

async function loadEmbed(slug: string, max: number | null): Promise<EmbedState> {
  const entityResponse = await supabase
    .from('entities')
    .select('actor_id, brand_name, craft_type, city, avatar_url')
    .eq('public_slug', slug)
    .maybeSingle()
  const entity = must(entityResponse)
  if (!entity) return { kind: 'missing' }

  const [participations, tagRows] = await Promise.all([
    supabase
      .from('participations')
      .select(
        'events!inner(id, name, start_date, end_date, city, department, tags, image_url, is_private)',
      )
      .eq('actor_id', entity.actor_id)
      .eq('visibility', 'public')
      .in('status', CONFIRMED_STATUSES),
    fetchTags(),
  ])
  const rows = must(participations).map((row) => row.events)
  return {
    kind: 'ready',
    entity: {
      name: entity.brand_name,
      craft: entity.craft_type,
      city: entity.city,
      avatarUrl: entity.avatar_url,
    },
    dates: upcomingEmbedDates(rows, parseSqlDate(todayIso()), max),
    tagStyles: tagStylesByName(tagRows),
  }
}

export function useEmbed(slug: string, max: number | null): EmbedState {
  const [state, setState] = useState<EmbedState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      let next: EmbedState
      try {
        next = await loadEmbed(slug, max)
      } catch {
        next = { kind: 'failed' }
      }
      if (cancelled) return
      setState(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [slug, max])

  return state
}
