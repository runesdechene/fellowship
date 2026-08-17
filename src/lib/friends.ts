/* -----------------------------------------------------------------------------
   Amis — un ami est un acteur suivi DANS LES DEUX SENS. La définition est ici,
   et nulle part ailleurs : le tableau de bord et la fiche d'un événement
   doivent compter les mêmes personnes.
   -------------------------------------------------------------------------- */

import { supabase } from '@/lib/supabase'
import type { EntityRow, ParticipationStatus, UserRow } from '@/types/database'

export interface Friend {
  id: string
  name: string
  avatarUrl: string | null
}

/**
 * Statuts considérés comme « une date programmée » : l'exposant s'est engagé,
 * ou son dossier est en cours. « interesse » et « refuse » n'en font pas partie.
 */
export const PROGRAMMED_STATUSES: ParticipationStatus[] = ['inscrit', 'confirme', 'en_cours']

/** Statuts qui valent pastille verte ; le reste passe en pastille terre. */
export const CONFIRMED_STATUSES: ParticipationStatus[] = ['inscrit', 'confirme']

/** Les acteurs suivis dans les deux sens : la définition d'un « ami ». */
export async function fetchMutualFriendIds(actorId: string): Promise<string[]> {
  const { data } = await supabase
    .from('follows')
    .select('follower_actor, following_actor')
    .or(`follower_actor.eq.${actorId},following_actor.eq.${actorId}`)

  const following = new Set<string>()
  const followers = new Set<string>()
  for (const row of data ?? []) {
    if (row.follower_actor === actorId) following.add(row.following_actor)
    if (row.following_actor === actorId) followers.add(row.follower_actor)
  }
  return [...following].filter((id) => followers.has(id))
}

/** Nom et image des amis, qu'ils soient une personne ou une enseigne. */
export async function fetchFriendProfiles(ids: string[]): Promise<Map<string, Friend>> {
  const byId = new Map<string, Friend>()
  if (ids.length === 0) return byId

  const [{ data: entities }, { data: users }] = await Promise.all([
    supabase.from('entities').select('actor_id, brand_name, avatar_url').in('actor_id', ids),
    supabase.from('users').select('actor_id, display_name, avatar_url').in('actor_id', ids),
  ])

  for (const row of (entities ?? []) as Pick<
    EntityRow,
    'actor_id' | 'brand_name' | 'avatar_url'
  >[]) {
    byId.set(row.actor_id, {
      id: row.actor_id,
      name: row.brand_name,
      avatarUrl: row.avatar_url,
    })
  }
  for (const row of (users ?? []) as Pick<
    UserRow,
    'actor_id' | 'display_name' | 'avatar_url'
  >[]) {
    if (byId.has(row.actor_id)) continue
    byId.set(row.actor_id, {
      id: row.actor_id,
      name: row.display_name ?? 'Ami',
      avatarUrl: row.avatar_url,
    })
  }
  return byId
}

/**
 * Les amis présents sur chacun des événements demandés, rangés par événement.
 * Une seule requête pour toutes les dates : c'est le tableau de bord qui a
 * dicté cette forme, la fiche d'un événement passe un tableau d'un seul id.
 */
export async function fetchFriendsByEvent(
  actorId: string,
  eventIds: string[],
): Promise<Map<string, Friend[]>> {
  const byEvent = new Map<string, Friend[]>()
  if (eventIds.length === 0) return byEvent

  const friendIds = await fetchMutualFriendIds(actorId)
  if (friendIds.length === 0) return byEvent

  const [{ data: participations }, profiles] = await Promise.all([
    supabase
      .from('participations')
      .select('actor_id, event_id')
      .in('actor_id', friendIds)
      .in('status', PROGRAMMED_STATUSES)
      .in('event_id', eventIds),
    fetchFriendProfiles(friendIds),
  ])

  for (const row of participations ?? []) {
    const friend = profiles.get(row.actor_id)
    if (!friend) continue
    const list = byEvent.get(row.event_id) ?? []
    list.push(friend)
    byEvent.set(row.event_id, list)
  }
  return byEvent
}
