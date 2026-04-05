import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from './NotificationItem'

interface SidebarActivityProps {
  collapsed: boolean
  onShowAll: () => void
}

export function SidebarActivity({ collapsed, onShowAll }: SidebarActivityProps) {
  const { notifications, unreadCount, markAsRead } = useNotifications()
  const followingIds = useFollowingIds()
  const recent = notifications.slice(0, 4)

  if (collapsed) {
    return (
      <button
        onClick={onShowAll}
        className="relative flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Activité
        </span>
        {unreadCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="px-2.5 py-2 text-xs text-muted-foreground">Aucune activité récente</p>
      ) : (
        <div className="space-y-0.5">
          {recent.map(n => {
            const data = (n.data ?? {}) as Record<string, unknown>
            const actorId = typeof data.actor_id === 'string' ? data.actor_id : undefined
            return (
              <NotificationItem
                key={n.id}
                notification={n}
                isFriend={!!actorId && followingIds.has(actorId)}
                onRead={markAsRead}
                compact
              />
            )
          })}
        </div>
      )}
      <button
        onClick={onShowAll}
        className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-center text-[0.6875rem] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        Voir tout →
      </button>
    </div>
  )
}
