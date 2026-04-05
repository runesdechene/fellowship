import { useFollowStatus } from '@/hooks/use-follows'
import './FollowButton.css'
import { useAuth } from '@/lib/auth'
import { UserPlus, UserCheck, Users } from 'lucide-react'

interface FollowButtonProps {
  targetId: string
  className?: string
}

export function FollowButton({ targetId, className }: FollowButtonProps) {
  const { user } = useAuth()
  const { isFollowing, isFriend, loading, toggleFollow } = useFollowStatus(targetId)

  if (!user || user.id === targetId) return null
  if (loading) return null

  if (isFriend) {
    return (
      <button className={`follow-btn follow-btn-friend ${className ?? ''}`} onClick={toggleFollow}>
        <Users strokeWidth={1.5} />
        Amis
      </button>
    )
  }

  if (isFollowing) {
    return (
      <button className={`follow-btn follow-btn-following ${className ?? ''}`} onClick={toggleFollow}>
        <UserCheck strokeWidth={1.5} />
        Suivi
      </button>
    )
  }

  return (
    <button className={`follow-btn follow-btn-follow ${className ?? ''}`} onClick={toggleFollow}>
      <UserPlus strokeWidth={1.5} />
      Suivre
    </button>
  )
}
