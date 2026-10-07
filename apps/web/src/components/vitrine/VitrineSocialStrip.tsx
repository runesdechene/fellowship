import { avatarGradient } from '@/lib/avatar-gradient'
import type { NetworkMember } from '@/lib/profile-network'

interface Props {
  followers: NetworkMember[]
  friends: NetworkMember[]
  onOpen?: () => void
}

/** Bande sociale compacte et cliquable : avatars empilés + « N abonnés · M compagnons ». */
export function VitrineSocialStrip({ followers, friends, onOpen }: Props) {
  const preview = followers.slice(0, 3)
  return (
    <button type="button" className="v-social" onClick={onOpen}>
      <div className="v-avs">
        {preview.map(m => {
          const name = m.brand_name ?? m.display_name ?? '?'
          return (
            <span key={m.id} style={!m.avatar_url ? { background: avatarGradient(name) } : undefined}>
              {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (name[0]?.toUpperCase() ?? '?')}
            </span>
          )
        })}
      </div>
      <span className="v-social-t">
        <b>{followers.length} abonné{followers.length !== 1 ? 's' : ''}</b>
        <span className="m"> · {friends.length} compagnon{friends.length !== 1 ? 's' : ''} exposant{friends.length !== 1 ? 's' : ''}</span>
      </span>
      <span className="v-social-ch" aria-hidden="true">›</span>
    </button>
  )
}
