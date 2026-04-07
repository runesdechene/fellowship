import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, UserPlus, Clock, MessageSquare, Calendar, ImagePlus, FileEdit, Info, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
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

function ActorAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: 22, height: 22 }}
      />
    )
  }
  const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: 22,
        height: 22,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: 9,
        fontWeight: 700,
        color: 'white',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

interface TypeConfigEntry {
  icon: typeof Users
  color: string
  actorName: (d: NotificationData) => string | null
  suffix: (d: NotificationData) => string
  link: (d: NotificationData) => string
}

const TYPE_CONFIG: Record<string, TypeConfigEntry> = {
  friend_going: {
    icon: Users,
    color: 'text-primary',
    actorName: (d) => d.actor_name ?? d.friend_name ?? 'Un ami',
    suffix: (d) => ` ${d.status === 'interesse' ? "s'intéresse à" : 'participe à'} ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  new_follower: {
    icon: UserPlus,
    color: 'text-accent',
    actorName: (d) => d.actor_name ?? d.follower_name ?? 'Quelqu\'un',
    suffix: () => ' te suit',
    link: () => '/profil',
  },
  deadline_reminder: {
    icon: Clock,
    color: 'text-destructive',
    actorName: () => null,
    suffix: (d) => `Inscription pour ${d.event_name ?? 'un événement'} bientôt`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  friend_note: {
    icon: MessageSquare,
    color: 'text-primary',
    actorName: (d) => d.actor_name ?? d.friend_name ?? 'Un ami',
    suffix: (d) => ` a laissé une note sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_created: {
    icon: Calendar,
    color: 'text-primary',
    actorName: (d) => d.actor_name ?? 'Quelqu\'un',
    suffix: (d) => ` a ajouté ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_updated: {
    icon: FileEdit,
    color: 'text-muted-foreground',
    actorName: () => null,
    suffix: (d) => `${d.event_name ?? 'Un événement'} a été modifié`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_image_added: {
    icon: ImagePlus,
    color: 'text-muted-foreground',
    actorName: () => null,
    suffix: (d) => `Photo ajoutée sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_info_added: {
    icon: Info,
    color: 'text-muted-foreground',
    actorName: () => null,
    suffix: (d) => `Info ajoutée sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  new_exposant: {
    icon: UserPlus,
    color: 'text-accent',
    actorName: (d) => d.actor_name ?? 'Un nouvel exposant',
    suffix: () => ' a rejoint Fellowship !',
    link: (d) => d.actor_id ? `/@${d.actor_id}` : '/explorer',
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
  const navigate = useNavigate()
  const { user } = useAuth()
  const data = (notification.data ?? {}) as NotificationData
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.event_created
  const Icon = config.icon
  const link = config.link(data)
  const nameText = config.actorName(data)
  const suffixText = config.suffix(data)
  const actorName = data.actor_name ?? data.friend_name ?? data.follower_name
  const actorId = data.actor_id

  // Follow-back state for new_follower notifications
  const showFollowBack = notification.type === 'new_follower' && !isFriend && !!actorId
  const [followedBack, setFollowedBack] = useState(false)

  const handleNameClick = (e: React.MouseEvent) => {
    if (!actorId) return
    e.preventDefault()
    e.stopPropagation()
    navigate(`/@${actorId}`)
  }

  const handleFollowBack = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || !actorId) return
    await supabase.from('follows').insert({ follower_id: user.id, following_id: actorId })
    setFollowedBack(true)
  }

  return (
    <Link
      to={link}
      onClick={() => !notification.read && onRead(notification.id)}
      className={`flex items-start gap-2.5 rounded-lg transition-colors hover:bg-muted ${
        compact ? 'px-2 py-1.5' : 'p-3'
      } ${!notification.read ? 'bg-primary/5' : ''}`}
    >
      {actorName ? (
        <ActorAvatar name={actorName} avatarUrl={data.actor_avatar_url} />
      ) : (
        <div className="mt-0.5 ml-0.5" style={{ width: 22 }}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`${compact ? 'text-xs' : 'text-sm'} ${!notification.read ? 'font-medium' : 'text-muted-foreground'} leading-snug`}>
          {nameText && actorId ? (
            <><span onClick={handleNameClick} className="font-semibold underline decoration-primary/30 hover:decoration-primary cursor-pointer">{nameText}</span>{suffixText}</>
          ) : nameText ? (
            <><span className="font-semibold">{nameText}</span>{suffixText}</>
          ) : (
            suffixText
          )}
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(notification.created_at)}</p>
        )}
        {showFollowBack && !compact && (
          followedBack || isFriend ? (
            <span
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: 'hsl(152 50% 38% / 0.12)', color: 'hsl(152 50% 32%)' }}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Ami !
            </span>
          ) : (
            <button
              onClick={handleFollowBack}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
              style={{ background: 'hsl(152 50% 38% / 0.12)', color: 'hsl(152 50% 32%)', border: 'none', transition: 'background 0.15s, transform 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(152 50% 38% / 0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'hsl(152 50% 38% / 0.12)')}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Devenir ami avec {nameText}
            </button>
          )
        )}
      </div>
      {!notification.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />}
    </Link>
  )
}
