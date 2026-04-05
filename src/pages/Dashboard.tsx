import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMyParticipations, useFriendsParticipations, type FriendParticipation } from '@/hooks/use-participations'
import { useRecentEvents } from '@/hooks/use-events'
import { useMyFriends, useMyFollowers } from '@/hooks/use-follows'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Compass, Clock } from 'lucide-react'

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
  const displayName = profile?.brand_name ?? profile?.display_name ?? ''

  return (
    <div className="page-width max-w-2xl p-5 sm:p-8">
      {/* Hero */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Bonjour, {displayName}</p>
        <h1 className="text-[28px] font-extrabold leading-tight mt-1">
          Prêt pour votre<br />prochain salon ?
        </h1>
      </div>

      {/* Countdown card */}
      {nextDate && (
        <div className="mb-6 rounded-3xl bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Prochain événement</span>
            <Clock className="h-4 w-4 text-primary/40" strokeWidth={1.5} />
          </div>
          <div className="text-[42px] font-extrabold leading-none text-foreground">
            J-{Math.max(0, daysUntil(nextDate.start_date))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {nextDate.name}, {nextDate.city}
          </p>
        </div>
      )}

      {/* Vos Événements */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Vos Événements</h2>
          <Link to="/calendrier" className="text-sm text-primary font-medium">
            Voir tout
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {upcoming.map(p => (
              <Link
                key={p.id}
                to={`/evenement/${p.event_id}`}
                className="group relative flex-shrink-0 w-[220px] overflow-hidden rounded-3xl"
                style={{ aspectRatio: '3/4' }}
              >
                {/* Full background image */}
                {p.events!.image_url ? (
                  <img src={p.events!.image_url} alt={p.events!.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-card to-secondary flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/10" strokeWidth={1.5} />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: p.events!.image_url ? 'linear-gradient(180deg, transparent 35%, rgba(15,10,5,0.85) 100%)' : 'none' }} />
                {/* Status badge top */}
                <div className="absolute left-3 top-3">
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      background: daysUntil(p.events!.start_date) <= 0 ? 'hsl(152 50% 40%)' : 'hsl(24 72% 44%)',
                      color: 'white',
                    }}
                  >
                    {daysUntil(p.events!.start_date) <= 0 ? 'En cours' : 'Confirmé'}
                  </span>
                </div>
                {/* Content bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className={`text-base font-bold leading-snug ${p.events!.image_url ? 'text-white' : 'text-foreground'}`}>
                    {p.events!.name}
                  </h3>
                  <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${p.events!.image_url ? 'text-white/50' : 'text-muted-foreground'}`}>
                    <Calendar className="h-3 w-3" strokeWidth={1.5} />
                    {new Date(p.events!.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {' • '}{p.events!.city}, FR
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-card p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/15" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune date à venir
            </p>
            <Link to="/explorer">
              <Button className="mt-4">
                <Compass className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Explorer les événements
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Activité Récente */}
      {friendActivity.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-extrabold mb-4">Activité Récente</h2>
          <div className="space-y-3">
            {friendActivity.slice(0, 5).map((p: FriendParticipation) => (
              <Link
                key={p.id}
                to={`/evenement/${p.event_id}`}
                className="flex items-center gap-4 py-1"
              >
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {p.profiles?.display_name} participe à {p.events?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Il y a quelques heures</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Explorer à proximité */}
      {recentEvents.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-extrabold mb-4">Explorer à proximité</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {recentEvents.slice(0, 4).map(event => (
              <Link
                key={event.id}
                to={`/evenement/${event.id}`}
                className="flex-shrink-0 w-[200px] overflow-hidden rounded-3xl relative"
                style={{ aspectRatio: '3/4' }}
              >
                {event.image_url ? (
                  <img src={event.image_url} alt={event.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-card to-secondary flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/10" strokeWidth={1.5} />
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(15,10,5,0.85) 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-sm font-bold text-white leading-snug">{event.name}</h3>
                  <p className="text-[11px] text-white/50 mt-1 uppercase tracking-wide">{event.city}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Réseau */}
      <section className="mb-10">
        <h2 className="text-xl font-extrabold mb-4">Réseau</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
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
                    className="flex items-center gap-3 rounded-2xl bg-card p-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(friend.brand_name ?? friend.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{friend.brand_name ?? friend.display_name ?? 'Utilisateur'}</p>
                      {friend.city && <p className="text-xs text-muted-foreground">{friend.city}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
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
                    className="flex items-center gap-3 rounded-2xl bg-card p-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(follower.brand_name ?? follower.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{follower.brand_name ?? follower.display_name ?? 'Utilisateur'}</p>
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
