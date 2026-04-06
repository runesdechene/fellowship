import { Link } from 'react-router-dom'
import { X, Users } from 'lucide-react'
import type { FriendParticipation } from '@/hooks/use-participations'

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

const STATUS_LABELS: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

const STATUS_COLORS: Record<string, string> = {
  inscrit: 'hsl(152 50% 38%)',
  en_cours: 'hsl(210 60% 50%)',
  interesse: 'hsl(38 90% 50%)',
}

interface CalendarFriendsModalProps {
  eventName: string
  friends: FriendParticipation[]
  onClose: () => void
}

export function CalendarFriendsModal({ eventName, friends, onClose }: CalendarFriendsModalProps) {
  const pros = friends.filter(f => f.profiles?.type === 'exposant')
  const visiteurs = friends.filter(f => f.profiles?.type === 'public')

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="calendar-modal-header">
          <div className="calendar-modal-title">
            <Users style={{ width: 18, height: 18, color: 'rgba(61,48,40,0.45)' }} strokeWidth={1.5} />
            <div>
              <span className="calendar-modal-heading">Amis participants</span>
              <span className="calendar-modal-event-name">{eventName}</span>
            </div>
          </div>
          <button onClick={onClose} className="calendar-modal-close">
            <X style={{ width: 16, height: 16 }} strokeWidth={1.5} />
          </button>
        </div>

        {/* List */}
        <div className="calendar-modal-list">
          {pros.length > 0 && (
            <>
              <div className="calendar-modal-section-label pro">Amis pro</div>
              {pros.map(fp => <FriendItem key={fp.id} friend={fp} />)}
            </>
          )}
          {visiteurs.length > 0 && (
            <>
              <div className="calendar-modal-section-label visiteur">Amis visiteurs</div>
              {visiteurs.map(fp => <FriendItem key={fp.id} friend={fp} />)}
            </>
          )}
          {pros.length === 0 && visiteurs.length === 0 && (
            <div className="calendar-modal-empty">Aucun ami sur cet événement</div>
          )}
        </div>
      </div>
    </div>
  )
}

function FriendItem({ friend }: { friend: FriendParticipation }) {
  const name = friend.profiles?.brand_name ?? friend.profiles?.display_name ?? '?'
  const slug = friend.profiles?.public_slug ?? friend.user_id
  const avatarUrl = friend.profiles?.avatar_url
  const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
  const status = friend.status ?? 'interesse'

  return (
    <Link to={`/@${slug}`} className="calendar-modal-friend" onClick={e => e.stopPropagation()}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="calendar-modal-friend-avatar" />
      ) : (
        <div
          className="calendar-modal-friend-avatar-letter"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {name[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className="calendar-modal-friend-info">
        <span className="calendar-modal-friend-name">{name}</span>
        <span className="calendar-modal-friend-type">
          {friend.profiles?.type === 'exposant' ? 'Exposant' : 'Visiteur'}
        </span>
      </div>
      <span
        className="calendar-modal-friend-status"
        style={{ color: STATUS_COLORS[status] ?? 'rgba(61,48,40,0.4)' }}
      >
        {STATUS_LABELS[status] ?? status}
      </span>
    </Link>
  )
}
