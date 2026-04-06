import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Notification } from '@/types/database'

// Community feed — platform-wide actions
export const ACTIVITY_TYPES = new Set([
  'event_created',
  'event_image_added',
  'event_info_added',
  'new_exposant',
])

// Personal — important to you
export const NOTIFICATION_TYPES = new Set([
  'new_follower',
  'friend_going',
  'friend_note',
  'deadline_reminder',
  'event_updated',
])

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const notifs = data ?? []
    setNotifications(notifs)
    setUnreadCount(notifs.filter(n => !n.read).length)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications()
  }, [user, fetchNotifications])

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function markAllAsRead() {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const activities = useMemo(() => notifications.filter(n => ACTIVITY_TYPES.has(n.type)), [notifications])
  const personalNotifs = useMemo(() => notifications.filter(n => NOTIFICATION_TYPES.has(n.type)), [notifications])
  const personalUnread = useMemo(() => personalNotifs.filter(n => !n.read).length, [personalNotifs])

  return { notifications, activities, personalNotifs, personalUnread, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications }
}
