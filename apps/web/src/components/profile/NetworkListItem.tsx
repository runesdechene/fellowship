import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { networkListItemDisplay, type NetworkMember } from '@/lib/profile-network'

interface NetworkListItemProps {
  member: NetworkMember
  rightSlot?: ReactNode
}

export function NetworkListItem({ member, rightSlot }: NetworkListItemProps) {
  const d = networkListItemDisplay(member)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10 }}>
      <Link
        to={d.target}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
        className="hover:bg-muted"
      >
        {d.avatarUrl ? (
          <img
            src={d.avatarUrl}
            alt={d.name}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${d.gradientFrom}, ${d.gradientTo})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {d.fallbackInitial}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {d.name}
          </div>
          {d.craftType && (
            <div style={{ fontSize: 11, color: 'rgba(61,48,40,0.4)' }}>{d.craftType}</div>
          )}
        </div>
      </Link>
      {rightSlot}
    </div>
  )
}
