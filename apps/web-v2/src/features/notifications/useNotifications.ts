/**
 * QUOI     — les notifications de l'utilisateur : lecture, « marquer comme lue », « tout marquer ».
 * POURQUOI — la cloche lit celles de TOUTES ses casquettes (sa personne et ses enseignes), comme la
 *            V1 : une question sur un festival arrive à l'enseigne, un abonné à la personne.
 * ATTENTION — pas de temps réel : relu à l'ouverture de l'app et à chaque ouverture du panneau
 *            (refresh). Les écritures sont optimistes ; un échec relit la base.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { notificationView, type NotificationView } from '@/lib/notifications'
import { must, supabase } from '@/lib/supabase'

const LIMIT = 50

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

  useEffect(() => {
    const ids = key === '' ? [] : key.split(',')
    if (ids.length === 0) return
    let cancelled = false
    async function run() {
      try {
        const rows = must(
          await supabase
            .from('notifications')
            .select('id, type, data, read, created_at')
            .in('actor_id', ids)
            .order('created_at', { ascending: false })
            .limit(LIMIT),
        )
        if (cancelled) return
        setViews(
          rows.flatMap((row) => {
            const data =
              row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {}
            const view = notificationView({ ...row, data })
            return view ? [view] : []
          }),
        )
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

  return {
    views,
    failed,
    unread: views.some((view) => !view.read),
    refresh,
    markRead,
    markAllRead,
  }
}
