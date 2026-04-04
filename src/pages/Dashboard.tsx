import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMyParticipations, useFriendsParticipations, type FriendParticipation } from '@/hooks/use-participations'
import { useCalendarYear } from '@/hooks/use-calendar'
import { YearView } from '@/components/calendar/YearView'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Users, ArrowRight } from 'lucide-react'

export function DashboardPage() {
  const { profile } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const { participations } = useMyParticipations(year)
  const { participations: friendActivity } = useFriendsParticipations()
  const months = useCalendarYear(participations, year)

  const upcomingCount = participations.filter(
    p => p.events && new Date(p.events.start_date) >= new Date()
  ).length

  const totalCount = participations.length

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Salut{profile?.brand_name ? `, ${profile.brand_name}` : profile?.display_name ? `, ${profile.display_name}` : ''} !
          </h1>
          <p className="text-muted-foreground">Ton année en un coup d'œil</p>
        </div>
        <Link to="/explorer">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un événement
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <Calendar className="mb-2 h-5 w-5 text-primary" />
          <p className="text-2xl font-bold">{totalCount}</p>
          <p className="text-xs text-muted-foreground">événements en {year}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <ArrowRight className="mb-2 h-5 w-5 text-accent" />
          <p className="text-2xl font-bold">{upcomingCount}</p>
          <p className="text-xs text-muted-foreground">à venir</p>
        </div>
      </div>

      <div className="mb-8">
        <YearView months={months} year={year} onYearChange={setYear} />
      </div>

      {friendActivity.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Tes amis bougent
          </h2>
          <div className="space-y-2">
            {friendActivity.slice(0, 10).map((p: FriendParticipation) => (
              <Link
                key={p.id}
                to={`/evenement/${p.event_id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {(p.profiles?.display_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 text-sm">
                  <span className="font-medium">{p.profiles?.display_name}</span>
                  {' participe à '}
                  <span className="font-medium">{p.events?.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 font-semibold">Ton calendrier est vide</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Commence par ajouter ton premier événement
          </p>
          <Link to="/explorer">
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Explorer les événements
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
