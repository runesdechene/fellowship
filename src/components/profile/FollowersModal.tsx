import { useState } from 'react'
import { X, UserCheck, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { NetworkListItem } from './NetworkListItem'
import { shouldShowFollowBack, type NetworkMember } from '@/lib/profile-network'

interface FollowersModalProps {
  followers: NetworkMember[]
  friendIds: Set<string>
  isOwner: boolean
  ownerEmptyLabel?: string
  onClose: () => void
}

export function FollowersModal({ followers, friendIds, isOwner, ownerEmptyLabel, onClose }: FollowersModalProps) {
  const { user } = useAuth()
  const [followedBack, setFollowedBack] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())

  const handleFollowBack = async (followerId: string) => {
    if (!user || pending.has(followerId)) return
    setPending(prev => new Set(prev).add(followerId))
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: followerId })
    setPending(prev => {
      const next = new Set(prev)
      next.delete(followerId)
      return next
    })
    if (!error) {
      setFollowedBack(prev => new Set(prev).add(followerId))
    }
  }

  const emptyLabel = isOwner ? ownerEmptyLabel ?? 'Personne ne te suit encore' : 'Aucun abonné'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[70vh] flex flex-col rounded-2xl bg-card overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid hsl(var(--border))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCheck style={{ width: 18, height: 18, color: 'rgba(61,48,40,0.45)' }} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
              Abonnés ({followers.length})
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'hsl(var(--muted))',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(61,48,40,0.5)',
            }}
            aria-label="Fermer"
          >
            <X style={{ width: 16, height: 16 }} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {followers.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(61,48,40,0.3)' }}>
              {emptyLabel}
            </div>
          ) : (
            followers.map(f => {
              const showBtn = shouldShowFollowBack(f.id, friendIds, isOwner) && !followedBack.has(f.id)
              const rightSlot = showBtn ? (
                <button
                  onClick={() => handleFollowBack(f.id)}
                  disabled={pending.has(f.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'hsl(var(--primary))',
                    color: 'white',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: pending.has(f.id) ? 'wait' : 'pointer',
                    flexShrink: 0,
                    opacity: pending.has(f.id) ? 0.6 : 1,
                  }}
                >
                  <UserPlus style={{ width: 12, height: 12 }} strokeWidth={2} />
                  Suivre
                </button>
              ) : undefined
              return <NetworkListItem key={f.id} member={f} rightSlot={rightSlot} />
            })
          )}
        </div>
      </div>
    </div>
  )
}
