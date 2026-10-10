/**
 * QUOI     — la liste « Qui y va » d'une fiche : pour chaque ami programmé, son statut, son
 *            métier et l'adresse de sa vitrine.
 * POURQUOI — la fiche ne nomme que trois amis ; la popup dit tout (maquette 2218:2). Chargée à
 *            l'ouverture seulement : la plupart des visites ne l'ouvrent pas.
 * ATTENTION — la RLS de `participations` décide qui on voit (« amis » : un ami seulement) ; la
 *            liste ne peut donc pas en dire plus que la fiche.
 */
import { useEffect, useState } from 'react'
import type { Friend } from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'
import { sortGoers } from '@/lib/who-goes'

export interface Goer extends Friend {
  status: string | null
  craft: string | null
  slug: string | null
}

async function loadGoers(eventId: string, friends: Friend[]): Promise<Goer[]> {
  const ids = friends.map((friend) => friend.id)
  const [participations, entities, publics] = await Promise.all([
    supabase
      .from('participations')
      .select('actor_id, status')
      .eq('event_id', eventId)
      .in('actor_id', ids),
    supabase.from('entities').select('actor_id, craft_type').in('actor_id', ids),
    supabase.from('actor_public').select('actor_id, public_slug').in('actor_id', ids),
  ])
  const status = new Map(must(participations).map((row) => [row.actor_id, row.status]))
  const craft = new Map(must(entities).map((row) => [row.actor_id, row.craft_type]))
  const slug = new Map(must(publics).map((row) => [row.actor_id, row.public_slug]))
  return sortGoers(
    friends.map((friend) => ({
      ...friend,
      status: status.get(friend.id) ?? null,
      craft: craft.get(friend.id)?.trim() || null,
      slug: slug.get(friend.id) ?? null,
    })),
  )
}

export function useWhoGoes(eventId: string | undefined, friends: Friend[], open: boolean) {
  const [goers, setGoers] = useState<Goer[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!open || !eventId || friends.length === 0) return
    let cancelled = false
    async function load(id: string) {
      let result: Goer[] | null
      try {
        result = await loadGoers(id, friends)
      } catch {
        result = null
      }
      if (cancelled) return
      setGoers(result)
      setError(result === null)
    }
    void load(eventId)
    return () => {
      cancelled = true
    }
  }, [eventId, friends, open])

  return { goers, error }
}
