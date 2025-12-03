import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Zap } from 'lucide-react'

export function LandingPage() {
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
            <Link to="/login">
              <Button>Se connecter</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Gérez vos événements.
            <br />
            <span className="text-muted-foreground">Ensemble.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Fellowship simplifie la gestion de vos événements professionnels.
            Suivez vos inscriptions, rejoignez des groupes d'entrepreneurs,
            et découvrez où vont vos pairs.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg">Commencer gratuitement</Button>
            </Link>
            <Button variant="outline" size="lg">En savoir plus</Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Gestion d'événements</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Suivez vos inscriptions, statuts et participations en un coup d'œil.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Groupes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Rejoignez des communautés d'entrepreneurs et voyez qui participe à quoi.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Outils rapides</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Gagnez du temps avec des outils pensés pour les professionnels.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Fellowship. Tous droits réservés.</p>
          <p className="mt-1">flw.sh</p>
        </div>
      </footer>
    </div>
  )
}
