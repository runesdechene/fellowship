import React from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { Link } from 'react-router-dom'
import { Bell, Users, UserPlus, Clock, MessageSquare, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/types/database'

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const data = notification.data as Record<string, unknown>

  const friendName = typeof data.friend_name === 'string' ? data.friend_name : 'Un ami'
  const followerName = typeof data.follower_name === 'string' ? data.follower_name : 'Quelqu\'un'
  const eventName = typeof data.event_name === 'string' ? data.event_name : 'un événement'
  const eventId = typeof data.event_id === 'string' ? data.event_id : ''
  const config: Record<string, { icon: React.ElementType; color: string; label: string; link: string }> = {
    friend_going: { icon: Users, color: 'text-primary', label: `${friendName} participe à ${eventName}`, link: `/evenement/${eventId}` },
    new_follower: { icon: UserPlus, color: 'text-accent', label: `${followerName} te suit`, link: `/profil` },
    deadline_reminder: { icon: Clock, color: 'text-destructive', label: `Inscription pour ${eventName} bientôt`, link: `/evenement/${eventId}` },
    friend_note: { icon: MessageSquare, color: 'text-primary', label: `${friendName} a laissé une note sur ${eventName}`, link: `/evenement/${eventId}` },
  }

  const { icon: Icon, color, label, link } = config[notification.type] ?? config.friend_going

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <Link
      to={link}
      onClick={() => !notification.read && onRead(notification.id)}
      className={`flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted ${!notification.read ? 'bg-primary/5' : ''}`}
    >
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-muted-foreground'}`}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(notification.created_at)}</p>
      </div>
      {!notification.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
    </Link>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NotificationPanel({ onClose: _onClose }: { onClose?: () => void } = {}) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-lg z-50 max-h-[70vh] flex flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="mr-1 h-3 w-3" />
            Tout lire
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Chargement...</p>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <div className="p-1">
            {notifications.map(n => (
              <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
