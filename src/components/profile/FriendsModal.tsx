import { X, Users } from 'lucide-react'
import { NetworkListItem } from './NetworkListItem'
import type { NetworkMember } from '@/lib/profile-network'

interface FriendsModalProps {
  friends: NetworkMember[]
  onClose: () => void
}

export function FriendsModal({ friends, onClose }: FriendsModalProps) {
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
            <Users style={{ width: 18, height: 18, color: 'rgba(61,48,40,0.45)' }} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
              Amis ({friends.length})
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
          {friends.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(61,48,40,0.3)' }}>
              Pas encore d'amis
            </div>
          ) : (
            friends.map(f => <NetworkListItem key={f.id} member={f} />)
          )}
        </div>
      </div>
    </div>
  )
}
