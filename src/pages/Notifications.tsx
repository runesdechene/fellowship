import { Bell, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { Button } from '@/components/ui/button'

export function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()

  return (
    <div className="page-width page-padding">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="mr-1 h-3 w-3" />
            Tout lire
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Chargement...</p>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {notifications.map(n => {
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
