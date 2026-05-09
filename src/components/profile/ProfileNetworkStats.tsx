import { useMemo, useState } from 'react'
import { FriendsModal } from './FriendsModal'
import { FollowersModal } from './FollowersModal'
import {
  getRecentPreview,
  AVATAR_GRADIENTS,
  hashName,
  type NetworkMember,
} from '@/lib/profile-network'
import './ProfileNetworkStats.css'

interface ProfileNetworkStatsProps {
  friends: NetworkMember[]
  followers: NetworkMember[]
  isOwner: boolean
}

export function ProfileNetworkStats({ friends, followers, isOwner }: ProfileNetworkStatsProps) {
  const [openModal, setOpenModal] = useState<'friends' | 'followers' | null>(null)

  const friendsPreview = useMemo(() => getRecentPreview(friends, 3), [friends])
  const followersPreview = useMemo(() => getRecentPreview(followers, 3), [followers])
  const friendIds = useMemo(() => new Set(friends.map(f => f.id)), [friends])

  return (
    <>
      <div className="pn-stats">
        <button
          className="pn-stat"
          onClick={() => setOpenModal('friends')}
          aria-label={`Voir les ${friends.length} amis`}
        >
          <BubbleStack members={friendsPreview} />
          <div className="pn-text">
            <span className="pn-num">{friends.length}</span>
            <span className="pn-label">{friends.length === 1 ? 'ami' : 'amis'}</span>
          </div>
        </button>
        <button
          className="pn-stat"
          onClick={() => setOpenModal('followers')}
          aria-label={`Voir les ${followers.length} abonnés`}
        >
          <BubbleStack members={followersPreview} />
          <div className="pn-text">
            <span className="pn-num">{followers.length}</span>
            <span className="pn-label">{followers.length === 1 ? 'abonné' : 'abonnés'}</span>
          </div>
        </button>
      </div>

      {openModal === 'friends' && (
        <FriendsModal friends={friends} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'followers' && (
        <FollowersModal
          followers={followers}
          friendIds={friendIds}
          isOwner={isOwner}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  )
}

function BubbleStack({ members }: { members: NetworkMember[] }) {
  if (members.length === 0) {
    return (
      <span className="pn-bubbles">
        <span className="pn-bubble pn-bubble-empty" aria-hidden />
      </span>
    )
  }
  return (
    <span className="pn-bubbles">
      {members.map(m => {
        const name = m.brand_name ?? m.display_name ?? '?'
        const [from, to] = AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
        return (
          <span
            key={m.id}
            className="pn-bubble"
            style={{
              background: m.avatar_url ? 'transparent' : `linear-gradient(135deg, ${from}, ${to})`,
            }}
            title={name}
          >
            {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (name[0]?.toUpperCase() ?? '?')}
          </span>
        )
      })}
    </span>
  )
}
