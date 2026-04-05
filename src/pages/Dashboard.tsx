import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMyParticipations, useFriendsParticipations, type FriendParticipation } from '@/hooks/use-participations'
import { useRecentEvents } from '@/hooks/use-events'
import { useMyFriends, useMyFollowers } from '@/hooks/use-follows'
import { EventCard } from '@/components/events/EventCard'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Users, UserCheck, ArrowRight, Compass, MapPin } from 'lucide-react'

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatCountdown(startDate: string, endDate: string): string {
  const daysToStart = daysUntil(startDate)
  const daysToEnd = daysUntil(endDate)
  if (daysToStart > 0) return `Dans ${daysToStart} jour${daysToStart > 1 ? 's' : ''}`
  if (daysToEnd >= 0) return 'En cours'
  return 'Passé'
}

export function DashboardPage() {
  const { profile } = useAuth()
  const currentYear = new Date().getFullYear()
  const { participations } = useMyParticipations(currentYear)
  const { participations: friendActivity } = useFriendsParticipations()
  const { events: recentEvents } = useRecentEvents(6)
  const { friends, loading: friendsLoading } = useMyFriends()
  const { followers, loading: followersLoading } = useMyFollowers()

  const upcoming = participations
    .filter(p => p.events && daysUntil(p.events.end_date) >= 0)
    .sort((a, b) => new Date(a.events!.start_date).getTime() - new Date(b.events!.start_date).getTime())
    .slice(0, 3)

  const nextDate = upcoming[0]?.events
  const subtitle = nextDate
    ? `Ta prochaine date est ${formatCountdown(nextDate.start_date, nextDate.end_date).toLowerCase()}`
    : 'Aucune date à venir'

  return (
    <div className="page-width p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Salut{profile?.brand_name ? `, ${profile.brand_name}` : profile?.display_name ? `, ${profile.display_name}` : ''} !
        </h1>
        <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>{subtitle}</p>
      </div>

      {/* Prochaines dates */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Calendar className="h-5 w-5 text-primary" />
            Prochaines dates
          </h2>
          <Link to="/calendrier" className="text-sm text-primary hover:underline" style={{ fontFamily: "'Inter', sans-serif" }}>
            Voir le calendrier <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map(p => (
              <Link
                key={p.id}
                to={`/evenement/${p.event_id}`}
                className="group relative flex h-[120px] overflow-hidden rounded-2xl"
              >
                {p.events!.image_url ? (
                  <img src={p.events!.image_url} alt={p.events!.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-card" />
                )}
                <div className="absolute inset-0" style={{ background: p.events!.image_url ? 'linear-gradient(90deg, rgba(15,10,5,0.75) 0%, rgba(15,10,5,0.3) 50%, transparent 100%)' : 'none' }} />
                <div className="relative flex w-full items-center gap-4 px-5">
                  <div className="text-center shrink-0">
                    <div className={`text-[28px] font-extrabold leading-none ${p.events!.image_url ? 'text-white' : 'text-primary'}`}>
                      {new Date(p.events!.start_date).getDate()}
                    </div>
                    <div className={`text-[10px] font-medium uppercase ${p.events!.image_url ? 'text-white/50' : 'text-primary/50'}`}>
                      {new Date(p.events!.start_date).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-base font-bold truncate ${p.events!.image_url ? 'text-white' : 'text-foreground'}`}>{p.events!.name}</div>
                    <div className={`text-[11px] mt-1 flex items-center gap-1 ${p.events!.image_url ? 'text-white/45' : 'text-muted-foreground'}`}>
                      <MapPin className="h-3 w-3" />
                      {p.events!.city}, {p.events!.department}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${p.events!.image_url ? 'bg-white/12 text-white/70' : 'bg-muted text-muted-foreground'}`}>
                    {formatCountdown(p.events!.start_date, p.events!.end_date)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
              Aucune date à venir
            </p>
            <Link to="/explorer">
              <Button className="mt-4">
                <Compass className="mr-2 h-4 w-4" />
                Explorer les événements
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Tes amis bougent */}
      {friendActivity.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-accent" />
              Tes amis bougent
            </h2>
            <Link to="/suivis" className="text-sm text-primary hover:underline" style={{ fontFamily: "'Inter', sans-serif" }}>
              Voir tout <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {friendActivity.slice(0, 5).map((p: FriendParticipation) => (
              <Link
                key={p.id}
                to={`/evenement/${p.event_id}`}
                className="flex items-center gap-3 rounded-2xl bg-card p-3"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {(p.profiles?.display_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <span className="font-medium">{p.profiles?.display_name}</span>
                  {' participe à '}
                  <span className="font-medium">{p.events?.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Derniers ajouts */}
      {recentEvents.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Plus className="h-5 w-5 text-muted-foreground" />
              Derniers ajouts
            </h2>
            <Link to="/explorer" className="text-sm text-primary hover:underline" style={{ fontFamily: "'Inter', sans-serif" }}>
              Explorer <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Réseau */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
          <Users className="h-5 w-5 text-accent" />
          Réseau
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Friends */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              Amis ({friendsLoading ? '…' : friends.length})
            </h3>
            {friendsLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pas encore d'amis</p>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <Link
                    key={friend.id}
                    to={`/@${friend.public_slug ?? friend.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3 hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(friend.brand_name ?? friend.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{friend.brand_name ?? friend.display_name ?? 'Utilisateur'}</p>
                      {friend.city && <p className="text-xs text-muted-foreground">{friend.city}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {/* Followers */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              <UserCheck className="inline h-4 w-4 mr-1" />
              Abonnés ({followersLoading ? '…' : followers.length})
            </h3>
            {followersLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : followers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Personne ne te suit encore</p>
            ) : (
              <div className="space-y-2">
                {followers.map(follower => (
                  <Link
                    key={follower.id}
                    to={`/@${follower.public_slug ?? follower.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3 hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(follower.brand_name ?? follower.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{follower.brand_name ?? follower.display_name ?? 'Utilisateur'}</p>
                      {follower.city && <p className="text-xs text-muted-foreground">{follower.city}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
