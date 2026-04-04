import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMyParticipations } from '@/hooks/use-participations'
import { useMyFriends, useMyFollowers } from '@/hooks/use-follows'
import { Button } from '@/components/ui/button'
import { Settings, Users, UserCheck, Calendar } from 'lucide-react'

function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-20 w-20 text-2xl' : size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'
  if (url) {
    return <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover`} />
  }
  return (
    <div className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export function ProfilePage() {
  const { profile } = useAuth()
  const { participations } = useMyParticipations()
  const { friends, loading: friendsLoading } = useMyFriends()
  const { followers, loading: followersLoading } = useMyFollowers()

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Chargement…
      </div>
    )
  }

  const displayName = profile.brand_name ?? profile.display_name ?? 'Utilisateur'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} url={profile.avatar_url} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {profile.city && (
              <p className="text-sm text-muted-foreground">{profile.city}</p>
            )}
            {profile.bio && (
              <p className="mt-1 text-sm text-foreground/80 max-w-xs">{profile.bio}</p>
            )}
          </div>
        </div>
        <Link to="/reglages">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Modifier mon profil
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Calendar className="mx-auto mb-1 h-5 w-5 text-primary" />
          <p className="text-2xl font-bold">{participations.length}</p>
          <p className="text-xs text-muted-foreground">événements</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-accent" />
          <p className="text-2xl font-bold">{friendsLoading ? '—' : friends.length}</p>
          <p className="text-xs text-muted-foreground">amis</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <UserCheck className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
          <p className="text-2xl font-bold">{followersLoading ? '—' : followers.length}</p>
          <p className="text-xs text-muted-foreground">abonnés</p>
        </div>
      </div>

      {/* Friends list */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Amis ({friends.length})
        </h2>
        {friendsLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pas encore d'amis. Suis quelqu'un qui te suit en retour !</p>
        ) : (
          <div className="space-y-2">
            {friends.map(friend => (
              <Link
                key={friend.id}
                to={`/@${friend.public_slug ?? friend.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted"
              >
                <Avatar
                  name={friend.brand_name ?? friend.display_name ?? '?'}
                  url={friend.avatar_url}
                  size="sm"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {friend.brand_name ?? friend.display_name ?? 'Utilisateur'}
                  </p>
                  {friend.city && (
                    <p className="text-xs text-muted-foreground">{friend.city}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Followers list */}
      <section>
        <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Abonnés ({followers.length})
        </h2>
        {followersLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : followers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Personne ne te suit encore.</p>
        ) : (
          <div className="space-y-2">
            {followers.map(follower => (
              <Link
                key={follower.id}
                to={`/@${follower.public_slug ?? follower.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted"
              >
                <Avatar
                  name={follower.brand_name ?? follower.display_name ?? '?'}
                  url={follower.avatar_url}
                  size="sm"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {follower.brand_name ?? follower.display_name ?? 'Utilisateur'}
                  </p>
                  {follower.city && (
                    <p className="text-xs text-muted-foreground">{follower.city}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
