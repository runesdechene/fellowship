/**
 * QUOI     — les notifications de l'utilisateur : lecture, « marquer comme lue », « tout marquer ».
 * POURQUOI — la cloche lit celles de TOUTES ses casquettes (sa personne et ses enseignes), comme la
 *            V1 : une question sur un festival arrive à l'enseigne, un abonné à la personne.
 * ATTENTION — pas de temps réel : relu à l'ouverture de l'app et à chaque ouverture du panneau
 *            (refresh). Les écritures sont optimistes ; un échec relit la base.
 *            Les images (avatars, affiches) sont relues à part : si elles manquent, l'icône reste.
 *            `seenAt` : la dernière ouverture de la cloche, sur la personne (users.notifications_seen_at),
 *            pour que le chiffre s'éteigne sur tous ses appareils.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { KNOWN_TYPES, notificationView, type NotificationView } from '@/lib/notifications'
import { must, supabase } from '@/lib/supabase'

const LIMIT = 50

/** La cloche dit tout sauf les nouveaux abonnés : son bloc « Demandes d'ami · Nouveaux abonnés »
 *  les montre (19/10/2026). La phrase reste dans KNOWN_TYPES pour la notification du téléphone. */
const BELL_TYPES = KNOWN_TYPES.filter((type) => type !== 'new_follower')

/** Les avatars d'aujourd'hui et les affiches, en deux lectures pour toute la liste. Une lecture
 *  ratée garde l'icône : l'image décore, elle ne doit pas taire la cloche. */
async function withPictures(views: NotificationView[]): Promise<NotificationView[]> {
  const ids = (kind: 'avatar' | 'poster') => [
    ...new Set(views.flatMap((view) => (view.picture?.kind === kind ? [view.picture.id] : []))),
  ]
  const [people, events] = await Promise.all([
    supabase.from('actor_public').select('actor_id, avatar_url').in('actor_id', ids('avatar')),
    supabase.from('events').select('id, image_url').in('id', ids('poster')),
  ])
  const urls = new Map<string, string | null>([
    ...(people.data ?? []).map((row) => [row.actor_id ?? '', row.avatar_url] as const),
    ...(events.data ?? []).map((row) => [row.id, row.image_url] as const),
  ])
  return views.map((view) =>
    view.picture
      ? {
          ...view,
          picture: { ...view.picture, url: urls.get(view.picture.id) ?? view.picture.url },
        }
      : view,
  )
}

export function useNotifications() {
  const { person, entities } = useAuth()
  const actorIds = useMemo(
    () => [...entities.map((entity) => entity.actor_id), ...(person ? [person.actor_id] : [])],
    [entities, person],
  )
  const key = actorIds.join(',')
  const [views, setViews] = useState<NotificationView[]>([])
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)
  const [openedAt, setOpenedAt] = useState<Date | null>(null)
  const stored = person?.notifications_seen_at
  const seenAt = openedAt ?? (stored ? new Date(stored) : null)

  useEffect(() => {
    const ids = key === '' ? [] : key.split(',')
    if (ids.length === 0) return
    let cancelled = false
    async function run() {
      try {
        const rows = must(
          await supabase
            .from('notifications')
            .select('id, actor_id, type, data, read, created_at')
            .in('actor_id', ids)
            .in('type', BELL_TYPES)
            .order('created_at', { ascending: false })
            .limit(LIMIT),
        )
        const pictured = await withPictures(
          rows.flatMap((row) => {
            const data =
              row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {}
            const view = notificationView({ ...row, data })
            return view ? [view] : []
          }),
        )
        if (cancelled) return
        setViews(pictured)
        setFailed(false)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [key, version])

  const refresh = useCallback(() => {
    setVersion((n) => n + 1)
  }, [])

  const markRead = useCallback(
    (id: string) => {
      setViews((list) => list.map((view) => (view.id === id ? { ...view, read: true } : view)))
      void supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .then(({ error }) => {
          if (error) refresh()
        })
    },
    [refresh],
  )

  const markAllRead = useCallback(() => {
    const ids = key === '' ? [] : key.split(',')
    setViews((list) => list.map((view) => ({ ...view, read: true })))
    void supabase
      .from('notifications')
      .update({ read: true })
      .in('actor_id', ids)
      .eq('read', false)
      .then(({ error }) => {
        if (error) refresh()
      })
  }, [key, refresh])

  /** La cloche s'ouvre : son chiffre s'éteint. Un échec d'écriture le rallume aussitôt ; les
   *  notifications, elles, restent non lues. */
  const markSeen = useCallback(() => {
    const now = new Date()
    setOpenedAt(now)
    if (!person) return
    void supabase
      .from('users')
      .update({ notifications_seen_at: now.toISOString() })
      .eq('actor_id', person.actor_id)
      .then(({ error }) => {
        if (error) setOpenedAt(null)
      })
  }, [person])

  /** « Repérer » une nouvelle édition, pour l'acteur à qui la notification a été écrite. */
  const markInterested = useCallback(
    async (ownerId: string, eventId: string) => {
      const { error } = await supabase.from('participations').upsert(
        {
          actor_id: ownerId,
          event_id: eventId,
          status: 'interesse',
          acted_by_user_id: person?.actor_id ?? null,
        },
        { onConflict: 'actor_id,event_id', ignoreDuplicates: true },
      )
      return !error
    },
    [person],
  )

  return {
    views,
    markInterested,
    failed,
    seenAt,
    markSeen,
    refresh,
    markRead,
    markAllRead,
  }
}
