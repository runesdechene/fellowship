import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

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

interface Participant {
  id: string
  display_name: string | null
  brand_name: string | null
  avatar_url: string | null
  public_slug: string | null
  craft_type: string | null
  status: string
  isFriend: boolean
}

interface ParticipantsModalProps {
  eventId: string
  onClose: () => void
}

export function ParticipantsModal({ eventId, onClose }: ParticipantsModalProps) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      // Get friend IDs
      let friendIds: string[] = []
      if (user) {
        const { data } = await supabase.rpc('get_friend_ids', { p_user_id: user.id })
        friendIds = (data as string[] | null) ?? []
      }

      // Get all participants on this event (RLS: inscrit is public)
      const { data: parts } = await supabase
        .from('participations')
        .select('status, profiles(id, display_name, brand_name, avatar_url, public_slug, craft_type)')
        .eq('event_id', eventId)

      if (!parts) { setLoading(false); return }

      const friendSet = new Set(friendIds)
      const result: Participant[] = parts
        .filter((p: { profiles: unknown }) => p.profiles)
        .map((p: { status: string; profiles: { id: string; display_name: string | null; brand_name: string | null; avatar_url: string | null; public_slug: string | null; craft_type: string | null } }) => ({
          ...p.profiles,
          status: p.status,
          isFriend: friendSet.has(p.profiles.id),
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
  }, [eventId, user])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[70vh] flex flex-col rounded-2xl bg-card overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 18, height: 18, color: 'rgba(61,48,40,0.45)' }} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
              Participants ({participants.length})
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'hsl(var(--muted))', border: 'none', cursor: 'pointer', color: 'rgba(61,48,40,0.5)' }}
          >
            <X style={{ width: 16, height: 16 }} strokeWidth={1.5} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(61,48,40,0.3)' }}>Chargement...</div>
          ) : participants.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(61,48,40,0.3)' }}>Aucun participant</div>
          ) : (
            <>
              {participants.some(p => p.isFriend) && (
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(252 56% 58%)', padding: '8px 8px 4px', marginTop: 4 }}>
                  👥 Amis
                </div>
              )}
              {participants.filter(p => p.isFriend).map(p => (
                <ParticipantItem key={p.id} participant={p} />
              ))}
              {participants.some(p => !p.isFriend) && (
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(61,48,40,0.35)', padding: '12px 8px 4px' }}>
                  Autres participants
                </div>
              )}
              {participants.filter(p => !p.isFriend).map(p => (
                <ParticipantItem key={p.id} participant={p} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ParticipantItem({ participant: p }: { participant: Participant }) {
  const name = p.brand_name ?? p.display_name ?? '?'
  const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]

  return (
    <Link
      to={`/@${p.public_slug ?? p.id}`}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 10, textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}
      className="hover:bg-muted"
    >
      {p.avatar_url ? (
        <img src={p.avatar_url} alt={name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${from}, ${to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
          {name[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        {p.craft_type && (
          <div style={{ fontSize: 11, color: 'rgba(61,48,40,0.4)' }}>{p.craft_type}</div>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLORS[p.status] ?? 'rgba(61,48,40,0.4)', flexShrink: 0 }}>
        {STATUS_LABELS[p.status] ?? p.status}
      </span>
    </Link>
  )
}
