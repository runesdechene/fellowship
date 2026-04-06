import { useState } from 'react'
import { Bell, Activity, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { Button } from '@/components/ui/button'

type Tab = 'notifications' | 'activity'

export function NotificationsPage() {
  const { personalNotifs, activities, personalUnread, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()
  const [tab, setTab] = useState<Tab>('notifications')

  const items = tab === 'notifications' ? personalNotifs : activities
  const currentUnread = tab === 'notifications' ? personalUnread : unreadCount - personalUnread

  function renderList() {
    if (loading) {
      return <p className="text-center text-sm text-muted-foreground py-8">Chargement...</p>
    }
    if (items.length === 0) {
      return (
        <div className="py-16 text-center">
          {tab === 'notifications' ? (
            <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
          ) : (
            <Activity className="mx-auto h-10 w-10 text-muted-foreground/30" />
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {tab === 'notifications' ? 'Aucune notification' : 'Aucune activité récente'}
          </p>
        </div>
      )
    }
    return (
      <div className="space-y-0.5">
        {items.map(n => {
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
    )
  }

  return (
    <div className="page-width page-padding">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Notifications</h1>
        {currentUnread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="mr-1 h-3 w-3" />
            Tout lire
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab('notifications')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'notifications' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="h-4 w-4" />
          Notifications
          {personalUnread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {personalUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'activity' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4" />
          Activité
        </button>
      </div>

      {renderList()}
    </div>
  )
}
