import { avatarGradient } from '@/lib/avatar-gradient'
import type { NetworkMember } from '@/lib/profile-network'

interface VitrineStatsProps {
  followers: NetworkMember[]
  friends: NetworkMember[]
  seasonCount: number
  year: number
}

/** Renders a single stacked-avatar group (up to 3 items) */
function MemberAvatars({ members }: { members: NetworkMember[] }) {
  const preview = members.slice(0, 3)
  return (
    <div className="v-avs">
      {preview.map((m) => {
        const name = m.brand_name ?? m.display_name ?? '?'
        const initial = name[0]?.toUpperCase() ?? '?'
        return (
          <span
            key={m.id}
            style={!m.avatar_url ? { background: avatarGradient(name) } : undefined}
            title={name}
          >
            {m.avatar_url ? (
              <img src={m.avatar_url} alt={name} />
            ) : (
              initial
            )}
          </span>
        )
      })}
    </div>
  )
}

export function VitrineStats({
  followers,
  friends,
  seasonCount,
  year,
}: VitrineStatsProps) {
  return (
    <div className="v-stats">
      {/* Followers */}
      <div className="v-stat">
        <MemberAvatars members={followers} />
        <div className="v-st">
          <b>{followers.length}</b>
          <span>abonné{followers.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Friends / compagnons */}
      <div className="v-stat">
        <MemberAvatars members={friends} />
        <div className="v-st">
          <b>{friends.length}</b>
          <span>compagnon{friends.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Season count — plain (non-interactive) */}
      <div className="v-stat-plain">
        <b>{seasonCount}</b>
        <span>festival{seasonCount !== 1 ? 's' : ''} en {year}</span>
      </div>
    </div>
  )
}
