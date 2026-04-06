// src/components/events/FriendRow.tsx
import { Link } from 'react-router-dom'

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

interface FriendOnEvent {
  id: string
  display_name: string | null
  brand_name: string | null
  avatar_url: string | null
  public_slug: string | null
  status: string
}

interface FriendRowProps {
  friends: FriendOnEvent[]
}

const STATUS_LABELS: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

export function FriendRow({ friends }: FriendRowProps) {
  if (friends.length === 0) return null

  return (
    <div className="friends-row">
      {friends.map(friend => {
        const name = friend.brand_name ?? friend.display_name ?? '?'
        const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
        return (
          <Link
            key={friend.id}
            to={`/@${friend.public_slug ?? friend.id}`}
            className="friend-item"
          >
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt={name} className="friend-avatar" />
            ) : (
              <div
                className="friend-avatar-fallback"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              >
                {name[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span className="friend-name">{name}</span>
            <span className={`friend-status ${friend.status}`}>
              {STATUS_LABELS[friend.status] ?? friend.status}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export type { FriendOnEvent }
