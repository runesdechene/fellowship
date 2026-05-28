import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Users, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import './ParticipantsModal.css'

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
  interesse: 'Repéré',
  en_cours: 'Dossier envoyé',
  inscrit: 'Accepté',
  refuse: 'Refusé',
}

const KNOWN_STATUSES = new Set(['interesse', 'en_cours', 'inscrit', 'refuse'])

interface Participant {
  actor_id: string
  label: string | null
  avatar_url: string | null
  public_slug: string | null
  entity_type: string | null
  kind: string
  status: string
  isFriend: boolean
}

interface ParticipantsModalProps {
  eventId: string
  onClose: () => void
}

export function ParticipantsModal({ eventId, onClose }: ParticipantsModalProps) {
  const { currentActor } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      // Get friend IDs (keyed on the current actor)
      let friendIds: string[] = []
      if (currentActor) {
        const { data } = await supabase.rpc('get_friend_ids', { p_user_id: currentActor.id })
        friendIds = (data as string[] | null) ?? []
      }

      // Get all participants on this event (RLS: inscrit is public)
      const { data: parts } = await supabase
        .from('participations')
        .select('actor_id, status')
        .eq('event_id', eventId)

      if (!parts || parts.length === 0) { setLoading(false); return }

      // Fetch actor_public rows for all actor_ids in a second query (VIEW — no FK embed possible)
      const actorIds = (parts as Array<{ actor_id: string; status: string }>).map(p => p.actor_id)
      const { data: actors } = await supabase
        .from('actor_public')
        .select('actor_id, label, avatar_url, public_slug, entity_type, kind')
        .in('actor_id', actorIds)

      const actorMap: Record<string, { label: string | null; avatar_url: string | null; public_slug: string | null; entity_type: string | null; kind: string }> = {}
      for (const a of (actors ?? [])) {
        if (a.actor_id) actorMap[a.actor_id] = { label: a.label, avatar_url: a.avatar_url, public_slug: a.public_slug, entity_type: a.entity_type, kind: a.kind ?? 'person' }
      }

      const friendSet = new Set(friendIds)
      const result: Participant[] = (parts as Array<{ actor_id: string; status: string }>)
        .filter(p => actorMap[p.actor_id])
        .map(p => ({
          ...actorMap[p.actor_id],
          actor_id: p.actor_id,
          status: p.status,
          isFriend: friendSet.has(p.actor_id),
        }))

      // Friends first, then others
      result.sort((a, b) => {
        if (a.isFriend && !b.isFriend) return -1
        if (!a.isFriend && b.isFriend) return 1
        return 0
      })

      setParticipants(result)
      setLoading(false)
    }

    fetch()
  }, [eventId, currentActor])

  const friends = participants.filter(p => p.isFriend)
  const others = participants.filter(p => !p.isFriend)

  return (
    <div className="participants-modal" onClick={onClose}>
      <div className="participants-card" onClick={e => e.stopPropagation()}>
        <div className="participants-head">
          <div className="participants-head-title">
            <Users strokeWidth={1.8} />
            Participants
            <span className="participants-head-count">({participants.length})</span>
          </div>
          <button className="participants-close" onClick={onClose} aria-label="Fermer">
            <X strokeWidth={1.8} />
          </button>
        </div>

        <div className="participants-body">
          {loading ? (
            <div className="participants-empty">Chargement…</div>
          ) : participants.length === 0 ? (
            <div className="participants-empty">Aucun participant pour l'instant</div>
          ) : (
            <>
              {friends.length > 0 && (
                <div className="participants-section-label friends">
                  <UserCheck strokeWidth={2.2} />
                  Tes compagnons ({friends.length})
                </div>
              )}
              {friends.map(p => <ParticipantItem key={p.actor_id} participant={p} />)}

              {others.length > 0 && (
                <div className="participants-section-label others">
                  Autres participants ({others.length})
                </div>
              )}
              {others.map(p => <ParticipantItem key={p.actor_id} participant={p} />)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ParticipantItem({ participant: p }: { participant: Participant }) {
  const name = p.label ?? '?'
  const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
  const statusClass = KNOWN_STATUSES.has(p.status) ? p.status : 'default'

  return (
    <Link to={`/@${p.public_slug ?? p.actor_id}`} className="participants-item">
      {p.avatar_url ? (
        <div className="participants-avatar">
          <img src={p.avatar_url} alt={name} />
        </div>
      ) : (
        <div
          className="participants-avatar"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {name[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className="participants-info">
        <div className="participants-name">{name}</div>
        {p.entity_type && <div className="participants-meta">{p.entity_type}</div>}
      </div>
      <span className={`participants-status ${statusClass}`}>
        {STATUS_LABELS[p.status] ?? p.status}
      </span>
    </Link>
  )
}
