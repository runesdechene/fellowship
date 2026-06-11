import { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from '@/components/notifications/NotificationItem'

export function NotificationsPage() {
  const { personalNotifs, personalUnread, loading, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()

  // Auto-read au montage (cohérent avec la cloche). markAllAsRead est idempotent.
  useEffect(() => {
    if (personalUnread > 0) markAllAsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalUnread])

  return (
    <div className="page-width page-padding">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Notifications</h1>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Chargement...</p>
      ) : personalNotifs.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {personalNotifs.map(n => {
            const data = (n.data ?? {}) as Record<string, unknown>
            const actorId = typeof data.actor_id === 'string' ? data.actor_id : undefined
            return (
              <NotificationItem
                key={n.id}
                notification={n}
                isFriend={!!actorId && followingIds.has(actorId)}
                onRead={markAsRead}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
