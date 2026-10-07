import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Notification } from '@/types/database'

// Personal — important to you
export const NOTIFICATION_TYPES = new Set([
  'new_follower',
  'friend_going',
  // 'friend_note' retiré : les notes d'événement sont strictement privées,
  // notifier les abonnés d'une note qu'ils ne peuvent pas lire = spam. Le
  // trigger DB émetteur est supprimé (cf. migration drop_private_note_notif).
  'review_reply',
  'deadline_reminder',
  'event_updated',
  'thread_reply',
  'best_reply',
])

export function useNotifications() {
  const { person, entities } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Modèle acteur : le feed regroupe les notifs de TOUS les acteurs que l'utilisateur
  // contrôle (sa personne + ses entités). Sur-ensemble du comportement legacy (user_id) :
  // ne cache rien, et fait remonter les notifs d'entité (ex. « X suit ta marque »).
  const actorIds = useMemo(
    () => [person?.actor_id, ...entities.map(e => e.actor_id)].filter((id): id is string => !!id),
    [person?.actor_id, entities]
  )

  const fetchNotifications = useCallback(async () => {
    if (actorIds.length === 0) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .in('actor_id', actorIds)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications(data ?? [])
    setLoading(false)
  }, [actorIds])

  useEffect(() => {
    if (actorIds.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications()
  }, [actorIds, fetchNotifications])

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllAsRead() {
    if (actorIds.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('actor_id', actorIds).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const personalNotifs = useMemo(() => notifications.filter(n => NOTIFICATION_TYPES.has(n.type)), [notifications])
  const personalUnread = useMemo(() => personalNotifs.filter(n => !n.read).length, [personalNotifs])

  return { notifications, personalNotifs, personalUnread, loading, markAsRead, markAllAsRead, refetch: fetchNotifications }
}
