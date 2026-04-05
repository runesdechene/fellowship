import { Link } from 'react-router-dom'
import { Users, UserPlus, Clock, MessageSquare, Calendar, ImagePlus, FileEdit, Info } from 'lucide-react'
import type { Notification, NotificationData } from '@/types/database'

const GRADIENTS = [
  ['#f0a060', '#e74c3c'],
  ['#6c5ce7', '#a29bfe'],
  ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'],
  ['#f39c12', '#d68910'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

function ActorAvatar({ name }: { name: string }) {
  const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: 22,
        height: 22,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 0 8px ${from}66`,
        fontSize: 9,
        fontWeight: 700,
        color: 'white',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const TYPE_CONFIG: Record<string, { icon: typeof Users; color: string; label: (d: NotificationData) => string; link: (d: NotificationData) => string }> = {
  friend_going: {
    icon: Users,
    color: 'text-primary',
    label: (d) => `${d.actor_name ?? d.friend_name ?? 'Un ami'} participe à ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  new_follower: {
    icon: UserPlus,
    color: 'text-accent',
    label: (d) => `${d.actor_name ?? d.follower_name ?? 'Quelqu\'un'} te suit`,
    link: () => '/profil',
  },
  deadline_reminder: {
    icon: Clock,
    color: 'text-destructive',
    label: (d) => `Inscription pour ${d.event_name ?? 'un événement'} bientôt`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  friend_note: {
    icon: MessageSquare,
    color: 'text-primary',
    label: (d) => `${d.actor_name ?? d.friend_name ?? 'Un ami'} a laissé une note sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_created: {
    icon: Calendar,
    color: 'text-primary',
    label: (d) => `${d.actor_name ?? 'Quelqu\'un'} a ajouté ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_updated: {
    icon: FileEdit,
    color: 'text-muted-foreground',
    label: (d) => `${d.event_name ?? 'Un événement'} a été modifié`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_image_added: {
    icon: ImagePlus,
    color: 'text-muted-foreground',
    label: (d) => `Photo ajoutée sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_info_added: {
    icon: Info,
    color: 'text-muted-foreground',
    label: (d) => `Info ajoutée sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface NotificationItemProps {
  notification: Notification
  isFriend: boolean
  onRead: (id: string) => void
  compact?: boolean
}

export function NotificationItem({ notification, isFriend, onRead, compact = false }: NotificationItemProps) {
  const data = (notification.data ?? {}) as NotificationData
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.event_created
  const Icon = config.icon
  const label = config.label(data)
  const link = config.link(data)
  const actorName = data.actor_name ?? data.friend_name ?? data.follower_name

  return (
    <Link
      to={link}
      onClick={() => !notification.read && onRead(notification.id)}
      className={`flex items-start gap-2.5 rounded-lg transition-colors hover:bg-muted ${
        compact ? 'px-2 py-1.5' : 'p-3'
      } ${!notification.read ? 'bg-primary/5' : ''} ${!isFriend && !compact ? 'opacity-60' : ''}`}
    >
      {isFriend && actorName ? (
        <ActorAvatar name={actorName} />
      ) : (
        <div className={`mt-0.5 ${isFriend ? '' : 'ml-0.5'}`} style={!isFriend ? { width: 22 } : undefined}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`${compact ? 'text-xs' : 'text-sm'} ${!notification.read ? 'font-medium' : 'text-muted-foreground'} leading-snug`}>
          {label}
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(notification.created_at)}</p>
        )}
      </div>
      {!notification.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />}
    </Link>
  )
}
