import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMyParticipations, useFriendsParticipations, type FriendParticipation } from '@/hooks/use-participations'
import { useRecentEvents } from '@/hooks/use-events'
import { useMyFriends, useMyFollowers } from '@/hooks/use-follows'
import { EventCard } from '@/components/events/EventCard'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Users, UserCheck, ArrowRight, Compass } from 'lucide-react'

const tagColors: Record<string, string> = {
  'médiéval': 'hsl(24 72% 44%)',
  'geek': 'hsl(220 70% 50%)',
  'marché': 'hsl(152 32% 40%)',
  'salon': 'hsl(140 40% 50%)',
  'foire': 'hsl(40 80% 50%)',
}

function getTagColor(tag: string): string {
  const key = Object.keys(tagColors).find(k => tag.toLowerCase().includes(k))
  return key ? tagColors[key] : 'hsl(24 72% 44%)'
}

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
                className="flex items-center gap-4 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-4 hover:shadow-[2px_0_40px_-10px_rgba(0,0,0,0.12)]"
                style={{ borderLeft: `4px solid ${getTagColor(p.events!.primary_tag)}` }}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{p.events!.name}</h3>
                  <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {new Date(p.events!.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {p.events!.end_date !== p.events!.start_date && ` — ${new Date(p.events!.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                    {' · '}{p.events!.city}, {p.events!.department}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    background: daysUntil(p.events!.start_date) <= 0 ? 'hsl(152 32% 40% / 0.12)' : 'hsl(24 72% 44% / 0.12)',
                    color: daysUntil(p.events!.start_date) <= 0 ? 'hsl(152 32% 40%)' : 'hsl(24 72% 44%)',
                  }}
                >
                  {formatCountdown(p.events!.start_date, p.events!.end_date)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-8 text-center">
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
                className="flex items-center gap-3 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-3 hover:shadow-[2px_0_40px_-10px_rgba(0,0,0,0.12)]"
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
                    className="flex items-center gap-3 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-3 hover:bg-muted transition-colors"
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
                    className="flex items-center gap-3 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-3 hover:bg-muted transition-colors"
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
