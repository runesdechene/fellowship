import { useEffect } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from './NotificationItem'
import { Button } from '@/components/ui/button'

interface NotificationSlidePanelProps {
  onClose: () => void
}

export function NotificationSlidePanel({ onClose }: NotificationSlidePanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <div className="flex-1" />
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
            <Check className="mr-1 h-3 w-3" />
            Tout lire
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto p-2">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Aucune notification</p>
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
    </div>
  )
}
