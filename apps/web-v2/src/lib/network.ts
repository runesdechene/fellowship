/**
 * QUOI     — le réseau de l'acteur actif : qui le suit (et quel genre de compte), ses amis, ses
 *            demandes d'ami ; suivre en retour, refuser ; les nouveaux abonnés de la semaine.
 * POURQUOI — Uriel, 19/10/2026 : « Ta communauté », les listes Mes amis / Mes abonnés, la cloche et
 *            la pastille de Communauté lisent la même chose. Un ami est suivi dans les deux sens ;
 *            une demande, un exposant qui te suit sans que tu le suives (friend_requests, qui écarte
 *            les refus) ; un compte festivalier n'est qu'un abonné.
 */
import { isRecent } from './dates'
import type { Friend } from './friends'
import { must, supabase } from './supabase'
import type { Database } from '@/types/supabase'

/** Le genre de compte : il dit qui peut devenir ami (un exposant) et se lit sous le nom. */
export type MemberKind = Database['public']['Enums']['entity_type'] | 'personne'

export interface Member extends Friend {
  /** L'adresse de sa vitrine, s'il en a une. */
  slug: string | null
  kind: MemberKind
  /** Depuis quand il me suit. */
  since: string
}

export interface FriendRequest extends Friend {
  city: string | null
}

export interface Network {
  /** Les plus récents d'abord. */
  followers: Member[]
  friends: Member[]
  requests: FriendRequest[]
}

/** Qui l'acteur suit, et qui le suit (avec la date), les plus récents d'abord. */
export async function readFollows(actorId: string) {
  const follows = must(
    await supabase
      .from('follows')
      .select('follower_actor, following_actor, created_at')
      .or(`follower_actor.eq.${actorId},following_actor.eq.${actorId}`)
      .order('created_at', { ascending: false }),
  )

  const following = new Set<string>()
  const followers: { id: string; since: string }[] = []
  for (const row of follows) {
    if (row.follower_actor === actorId) following.add(row.following_actor)
    if (row.following_actor === actorId) {
      followers.push({ id: row.follower_actor, since: row.created_at })
    }
  }
  return { following, followers }
}

/** Nom, image, vitrine et genre de chaque abonné, dans l'ordre reçu. */
async function readMembers(followers: { id: string; since: string }[]): Promise<Member[]> {
  if (followers.length === 0) return []
  const rows = must(
    await supabase
      .from('actor_public')
      .select('actor_id, label, avatar_url, public_slug, entity_type')
      .in(
        'actor_id',
        followers.map((follower) => follower.id),
      ),
  )
  const byId = new Map(rows.map((row) => [row.actor_id, row]))
  return followers.flatMap(({ id, since }) => {
    const row = byId.get(id)
    if (!row) return []
    return [
      {
        id,
        name: row.label ?? '',
        avatarUrl: row.avatar_url,
        slug: row.public_slug,
        kind: row.entity_type ?? 'personne',
        since,
      },
    ]
  })
}

/** `own` : les comptes de la même personne, qui ne sont ni des abonnés ni des amis. */
export async function fetchNetwork(actorId: string, own: ReadonlySet<string>): Promise<Network> {
  const [{ following, followers }, requests] = await Promise.all([
    readFollows(actorId),
    supabase.rpc('friend_requests', { p_actor: actorId }),
  ])
  const members = await readMembers(followers.filter((follower) => !own.has(follower.id)))
  return {
    followers: members,
    friends: members.filter((member) => following.has(member.id)),
    requests: must(requests).map((row) => ({
      id: row.id,
      name: row.name,
      avatarUrl: row.avatar,
      city: row.city,
    })),
  }
}

/** Suivre en retour : la demande devient une amitié. */
export async function followBack(actorId: string, id: string): Promise<void> {
  must(await supabase.from('follows').insert({ follower_actor: actorId, following_actor: id }))
}

/** Refuser une demande : elle ne revient plus, l'abonné reste abonné. */
export async function declineRequest(actorId: string, followerId: string): Promise<void> {
  must(await supabase.rpc('decline_friend_request', { p_actor: actorId, p_follower: followerId }))
}

/** « Nouveaux abonnés » de la cloche : les comptes non exposants arrivés ces sept derniers jours. */
export function newFollowers(followers: Member[], now: Date): Member[] {
  return followers.filter((member) => member.kind !== 'exposant' && isRecent(member.since, now, 7))
}

const KIND_LABELS: Record<MemberKind, string> = {
  exposant: 'Exposant',
  festival: 'Festival',
  entreprise: 'Entreprise',
  personne: 'Festivalier',
}

/** Ce qu'on lit sous le nom, dans les listes Mes amis / Mes abonnés. */
export function kindLabel(kind: MemberKind): string {
  return KIND_LABELS[kind]
}

/** « 12 amis », « 1 abonné » : les deux nombres de « Ta communauté », chacun un lien. */
export function peopleCount(count: number, word: 'ami' | 'abonné'): string {
  return `${String(count)} ${word}${count === 1 ? '' : 's'}`
}

/**
 * Le mur de visages de « Ta communauté » : les amis d'abord, ceux qui ont une photo avant les
 * initiales. `room` cases en tout ; s'il y a plus de monde, la dernière dit « +N » (`more`).
 */
export function wallOf(network: Network, room: number): { faces: Member[]; more: number } {
  const friends = new Set(network.friends.map((member) => member.id))
  const rank = (member: Member) => (friends.has(member.id) ? 0 : 2) + (member.avatarUrl ? 0 : 1)
  const sorted = [...network.followers].sort((a, b) => rank(a) - rank(b))
  if (sorted.length <= room) return { faces: sorted, more: 0 }
  return { faces: sorted.slice(0, room - 1), more: sorted.length - (room - 1) }
}

/** « Mathéo, Nolroc et 1 autre suivent ta vitrine » : la ligne des nouveaux abonnés. */
export function newcomersPhrase(names: string[]): string {
  const [first, second] = names
  if (!first) return ''
  if (!second) return `${first} suit ta vitrine`
  if (names.length === 2) return `${first} et ${second} suivent ta vitrine`
  const others = names.length - 2
  return `${first}, ${second} et ${String(others)} ${others === 1 ? 'autre' : 'autres'} suivent ta vitrine`
}

/** « 2 demandes d’ami en attente ». */
export function requestsLabel(count: number): string {
  return count === 1 ? '1 demande d’ami en attente' : `${String(count)} demandes d’ami en attente`
}
