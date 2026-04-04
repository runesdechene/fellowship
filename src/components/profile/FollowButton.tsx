import { useFollowStatus } from '@/hooks/use-follows'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
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
      <Button variant="secondary" className={className} onClick={toggleFollow}>
        <Users className="mr-2 h-4 w-4" />
        Amis
      </Button>
    )
  }

  if (isFollowing) {
    return (
      <Button variant="outline" className={className} onClick={toggleFollow}>
        <UserCheck className="mr-2 h-4 w-4" />
        Suivi
      </Button>
    )
  }

  return (
    <Button className={className} onClick={toggleFollow}>
      <UserPlus className="mr-2 h-4 w-4" />
      Suivre
    </Button>
  )
}
