import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Settings, Plus, Calendar, Users } from 'lucide-react'

export function AppPage() {
  const { user } = useAuth()
  const { profile } = useProfile()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">F</span>
            </div>
            <span className="text-xl font-semibold">Fellowship</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/app/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Salut{profile?.full_name ? `, ${profile.full_name}` : ''} 👋
          </h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 text-left transition-colors hover:bg-accent">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Ajouter un événement</h3>
              <p className="text-sm text-muted-foreground">Rechercher ou créer</p>
            </div>
          </button>

          <button className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 text-left transition-colors hover:bg-accent">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Mes événements</h3>
              <p className="text-sm text-muted-foreground">0 à venir</p>
            </div>
          </button>

          <button className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 text-left transition-colors hover:bg-accent">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Mes groupes</h3>
              <p className="text-sm text-muted-foreground">0 groupe</p>
            </div>
          </button>
        </div>

        {/* Empty state */}
        <div className="mt-12 rounded-xl border border-dashed border-border p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-semibold">Aucun événement</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Commence par ajouter ton premier événement
          </p>
          <Button className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un événement
          </Button>
        </div>
      </main>
    </div>
  )
}
