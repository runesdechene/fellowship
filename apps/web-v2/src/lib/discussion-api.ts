/**
 * QUOI     — les lectures et écritures des sujets et du tchat : RPC de la base, médias du bucket
 *            `discussions`, abonnement au temps réel.
 * POURQUOI — un seul endroit parle à la base pour cette fonction ; les écrans n'appellent que ces
 *            fonctions. Toute écriture se fait au nom de l'acteur actif (la base vérifie
 *            can_act_as).
 * ATTENTION — le bucket `discussions` est privé et se crée à la main : les médias se lisent par
 *            URL signée.
 */
import { fetchActorProfiles, PROGRAMMED_STATUSES } from './friends'
import { imageProblem, resizeImage } from './image-resize'
import { must, supabase } from './supabase'
import type { Audience, ChatMessage, Person } from './discussions'
import type { Database } from '@/types/supabase'

type Rpc = Database['public']['Functions']
export type StorySujet = Rpc['sujets_du_moment']['Returns'][number]
export type InboxRow = Rpc['mes_conversations']['Returns'][number]
type MediaKind = 'image' | 'video'

const BUCKET = 'discussions'
const SIGNED_TTL = 60 * 60
const PHOTO_WIDTH = 1600
const VIDEO_MAX = 50 * 1024 * 1024

export async function fetchStoryBar(actorId: string): Promise<StorySujet[]> {
  return must(await supabase.rpc('sujets_du_moment', { p_actor: actorId }))
}

export async function fetchInbox(actorId: string): Promise<InboxRow[]> {
  return must(await supabase.rpc('mes_conversations', { p_actor: actorId }))
}

/** Les autres membres de la boîte arrivent en JSON : on les relit en personnes. */
export function othersOf(row: InboxRow): Person[] {
  if (!Array.isArray(row.others)) return []
  return row.others.flatMap((other) => {
    if (typeof other !== 'object' || other === null || Array.isArray(other)) return []
    const id = typeof other.id === 'string' ? other.id : null
    if (!id) return []
    return [
      {
        id,
        label: typeof other.label === 'string' ? other.label : 'Exposant',
        avatar: typeof other.avatar === 'string' ? other.avatar : null,
      },
    ]
  })
}

export interface ConversationDetail {
  id: string
  kind: 'sujet' | 'direct' | 'groupe'
  title: string | null
  createdBy: string
  mot: string | null
  /** La photo ou la vidéo d'un sujet, montrée en grand sur sa story. */
  mediaPath: string | null
  mediaKind: MediaKind | null
  audience: Audience | null
  eventId: string | null
  expiresAt: string | null
  closedAt: string | null
  members: (Person & { lastReadAt: string; muted: boolean })[]
}

export async function fetchConversation(id: string): Promise<ConversationDetail | null> {
  const [conversationResponse, membersResponse] = await Promise.all([
    supabase
      .from('conversations')
      .select(
        'id, kind, title, created_by, mot, media_path, media_kind, audience, event_id, expires_at, closed_at',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('conversation_members')
      .select('actor_id, last_read_at, muted, joined_at')
      .eq('conversation_id', id)
      .order('joined_at'),
  ])
  const conversation = must(conversationResponse)
  if (!conversation) return null
  const members = must(membersResponse)
  const profiles = await fetchActorProfiles(members.map((member) => member.actor_id))
  return {
    id: conversation.id,
    kind: conversation.kind,
    title: conversation.title,
    createdBy: conversation.created_by,
    mot: conversation.mot,
    mediaPath: conversation.media_path,
    mediaKind: conversation.media_kind,
    audience: conversation.audience,
    eventId: conversation.event_id,
    expiresAt: conversation.expires_at,
    closedAt: conversation.closed_at,
    members: members.map((member) => {
      const profile = profiles.get(member.actor_id)
      return {
        id: member.actor_id,
        label: profile?.name ?? 'Exposant',
        avatar: profile?.avatarUrl ?? null,
        lastReadAt: member.last_read_at,
        muted: member.muted,
      }
    }),
  }
}

type MessageRow = Database['public']['Tables']['messages']['Row']

function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    authorId: row.author_actor,
    body: row.body,
    mediaPath: row.media_path,
    mediaKind: row.media_kind,
    createdAt: row.created_at,
  }
}

const MESSAGE_COLUMNS =
  'id, conversation_id, author_actor, body, media_path, media_kind, created_at'

/** Les 300 derniers messages, du plus ancien au plus récent. */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const rows = must(
    await supabase
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(300),
  )
  return rows.map(toChatMessage).reverse()
}

/** Chaque nouveau message de la conversation, dès qu'il est écrit ; rend de quoi se désabonner. */
export function watchMessages(conversationId: string, onMessage: (message: ChatMessage) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(toChatMessage(payload.new as MessageRow)),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

export interface Media {
  path: string
  kind: MediaKind
}

/** La photo réduite, ou la vidéo telle quelle (50 Mo au plus) : rend son chemin, ou la raison du refus. */
export async function uploadMedia(actorId: string, file: File): Promise<Media | string> {
  const video = file.type.startsWith('video/')
  let body: Blob = file
  if (video) {
    if (file.size > VIDEO_MAX) return 'Cette vidéo dépasse 50 Mo.'
  } else {
    const refused = imageProblem(file)
    if (refused) return refused
    try {
      body = await resizeImage(file, PHOTO_WIDTH)
    } catch {
      return 'Cette image ne peut pas être utilisée.'
    }
  }
  const extension = video
    ? (file.name.split('.').pop() ?? 'mp4').toLowerCase()
    : body.type === 'image/webp'
      ? 'webp'
      : 'jpg'
  const path = `${actorId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: body.type || file.type })
  if (error) return 'L’envoi du fichier a échoué. Réessaie.'
  return { path, kind: video ? 'video' : 'image' }
}

/** Les adresses signées des médias demandés ; un chemin illisible n'a simplement pas d'adresse. */
export async function signedMediaUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL)
  if (error) throw new Error(error.message)
  for (const item of data) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  return urls
}

export async function publishSujet(
  actorId: string,
  mot: string,
  audience: Audience,
  eventId: string | null,
  media: Media | null,
): Promise<string> {
  return must(
    await supabase.rpc('publier_sujet', {
      p_actor: actorId,
      p_mot: mot,
      p_audience: audience,
      ...(eventId ? { p_event: eventId } : {}),
      ...(media ? { p_media_path: media.path, p_media_kind: media.kind } : {}),
    }),
  )
}

export async function sendMessage(
  actorId: string,
  conversationId: string,
  body: string,
  media: Media | null,
): Promise<void> {
  must(
    await supabase.rpc('envoyer_message', {
      p_actor: actorId,
      p_conversation: conversationId,
      ...(body.trim() ? { p_body: body } : {}),
      ...(media ? { p_media_path: media.path, p_media_kind: media.kind } : {}),
    }),
  )
}

export async function openConversation(
  actorId: string,
  others: string[],
  title: string,
): Promise<string> {
  return must(
    await supabase.rpc('ouvrir_conversation', {
      p_actor: actorId,
      p_others: others,
      ...(title.trim() ? { p_title: title } : {}),
    }),
  )
}

export async function markRead(actorId: string, conversationId: string): Promise<void> {
  must(await supabase.rpc('marquer_lu', { p_actor: actorId, p_conversation: conversationId }))
}

export async function closeSujet(actorId: string, conversationId: string): Promise<void> {
  must(await supabase.rpc('cloturer_sujet', { p_actor: actorId, p_conversation: conversationId }))
}

export async function addMembers(
  actorId: string,
  conversationId: string,
  others: string[],
): Promise<void> {
  must(
    await supabase.rpc('ajouter_membres', {
      p_actor: actorId,
      p_conversation: conversationId,
      p_others: others,
    }),
  )
}

export async function renameGroup(
  actorId: string,
  conversationId: string,
  title: string,
): Promise<void> {
  must(
    await supabase.rpc('renommer_groupe', {
      p_actor: actorId,
      p_conversation: conversationId,
      p_title: title,
    }),
  )
}

export async function leaveConversation(actorId: string, conversationId: string): Promise<void> {
  must(
    await supabase.rpc('quitter_conversation', {
      p_actor: actorId,
      p_conversation: conversationId,
    }),
  )
}

export async function setMuted(
  actorId: string,
  conversationId: string,
  muted: boolean,
): Promise<void> {
  must(
    await supabase.rpc('regler_sourdine', {
      p_actor: actorId,
      p_conversation: conversationId,
      p_muted: muted,
    }),
  )
}

/** Les personnes à qui écrire : les amis d'abord (lib/friends.ts), puis la recherche par nom. */
export async function searchPeople(words: string, viewerId: string): Promise<Person[]> {
  const pattern = `%${words.trim()}%`
  const rows = must(
    await supabase
      .from('actor_public')
      .select('actor_id, label, avatar_url')
      .ilike('label', pattern)
      .neq('actor_id', viewerId)
      .order('label')
      .limit(20),
  )
  return rows.flatMap((row) =>
    row.actor_id
      ? [{ id: row.actor_id, label: row.label ?? 'Exposant', avatar: row.avatar_url }]
      : [],
  )
}

export interface EventBrief {
  id: string
  name: string
  tags: string[] | null
  imageUrl: string | null
  startDate: string
  endDate: string
}

/** Le festival dont parle un sujet ; `null` s'il n'est plus lisible (fiche privée, supprimée). */
export async function fetchEventBrief(eventId: string): Promise<EventBrief | null> {
  // En deux temps : `must(await … .maybeSingle())` d'une traite se type en `never` (.claude/rules/v2.md).
  const response = await supabase
    .from('events')
    .select('id, name, tags, image_url, start_date, end_date')
    .eq('id', eventId)
    .maybeSingle()
  const row = must(response)
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    tags: row.tags,
    imageUrl: row.image_url,
    startDate: row.start_date,
    endDate: row.end_date,
  }
}

/** Mes prochaines dates programmées : ce dont un sujet peut parler. */
export async function fetchMyUpcomingEvents(
  actorId: string,
  todaySql: string,
): Promise<EventBrief[]> {
  const rows = must(
    await supabase
      .from('participations')
      .select('events!inner(id, name, tags, image_url, start_date, end_date)')
      .eq('actor_id', actorId)
      .in('status', PROGRAMMED_STATUSES)
      .gte('events.end_date', todaySql),
  )
  // Le tri d'une table jointe ne range pas les lignes parentes : on trie ici.
  const events = rows
    .map(({ events }) => events)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 8)
  return events.map((events) => ({
    id: events.id,
    name: events.name,
    tags: events.tags,
    imageUrl: events.image_url,
    startDate: events.start_date,
    endDate: events.end_date,
  }))
}
