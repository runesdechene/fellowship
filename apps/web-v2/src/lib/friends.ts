/**
 * QUOI     — qui sont les amis présents sur une date, et quels statuts comptent comme «
 *            programmé » ou « confirmé ».
 * POURQUOI — un ami est un acteur suivi DANS LES DEUX SENS ; la définition vit ici seulement,
 *            pour que le tableau de bord et la fiche comptent les mêmes personnes.
 */

import { groupCompanions } from '@/lib/calendar'
import { must, supabase } from '@/lib/supabase'
import type { ParticipationStatus } from '@/types/database'

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
async function fetchMutualFriendIds(actorId: string): Promise<string[]> {
  const follows = must(
    await supabase
      .from('follows')
      .select('follower_actor, following_actor')
      .or(`follower_actor.eq.${actorId},following_actor.eq.${actorId}`),
  )

  const following = new Set<string>()
  const followers = new Set<string>()
  for (const row of follows) {
    if (row.follower_actor === actorId) following.add(row.following_actor)
    if (row.following_actor === actorId) followers.add(row.follower_actor)
  }
  return [...following].filter((id) => followers.has(id))
}

/**
 * Nom et image d'acteurs quelconques — personnes ou enseignes.
 *
 * Ne sert pas qu'aux amis : la discussion d'un festival s'en sert pour nommer
 * les auteurs des questions et des reponses. Le type `Friend` porte le meme
 * mensonge dans son nom, il decrit en realite n'importe quel acteur affiche.
 */
export async function fetchActorProfiles(ids: string[]): Promise<Map<string, Friend>> {
  const byId = new Map<string, Friend>()
  if (ids.length === 0) return byId

  const [entitiesResponse, usersResponse] = await Promise.all([
    supabase.from('entities').select('actor_id, brand_name, avatar_url').in('actor_id', ids),
    supabase.from('users').select('actor_id, display_name, avatar_url').in('actor_id', ids),
  ])

  for (const row of must(entitiesResponse)) {
    byId.set(row.actor_id, {
      id: row.actor_id,
      name: row.brand_name,
      avatarUrl: row.avatar_url,
    })
  }
  for (const row of must(usersResponse)) {
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

  const [participationsResponse, profiles] = await Promise.all([
    supabase
      .from('participations')
      .select('actor_id, event_id')
      .in('actor_id', friendIds)
      .in('status', PROGRAMMED_STATUSES)
      .in('event_id', eventIds),
    fetchActorProfiles(friendIds),
  ])

  for (const row of must(participationsResponse)) {
    const friend = profiles.get(row.actor_id)
    if (!friend) continue
    const list = byEvent.get(row.event_id) ?? []
    list.push(friend)
    byEvent.set(row.event_id, list)
  }
  return byEvent
}

/** Un festival où vont des amis sans moi : ce que montre « Compagnons » au bas d'un mois. */
export interface CompanionEvent {
  eventId: string
  name: string
  startDate: string
  endDate: string
  friends: Friend[]
}

/**
 * Les dates programmées par mes amis dans la fenêtre [from, to[, hors festivals où je vais déjà.
 * Même définition de l'ami que partout (suivi réciproque) et mêmes statuts que « programmé ».
 */
export async function fetchCompanions(
  actorId: string,
  fromSql: string,
  toSql: string,
  myEventIds: Set<string>,
): Promise<CompanionEvent[]> {
  const friendIds = await fetchMutualFriendIds(actorId)
  if (friendIds.length === 0) return []

  const [participationsResponse, profiles] = await Promise.all([
    supabase
      .from('participations')
      .select('actor_id, event_id, events!inner(name, start_date, end_date)')
      .in('actor_id', friendIds)
      .in('status', PROGRAMMED_STATUSES)
      .gte('events.end_date', fromSql)
      .lt('events.start_date', toSql),
    fetchActorProfiles(friendIds),
  ])
  const rows = must(participationsResponse)

  const grouped = groupCompanions(
    rows.flatMap((row) => {
      const friend = profiles.get(row.actor_id)
      return friend ? [{ eventId: row.event_id, friend }] : []
    }),
    myEventIds,
  )
  const events = new Map(rows.map((row) => [row.event_id, row.events]))

  return [...grouped].flatMap(([eventId, friends]) => {
    const event = events.get(eventId)
    if (!event) return []
    return [
      { eventId, name: event.name, startDate: event.start_date, endDate: event.end_date, friends },
    ]
  })
}
