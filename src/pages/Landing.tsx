import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Calendar, Users, BarChart3, MapPin, Heart, ArrowRight } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-transparent bg-background/80 backdrop-blur-xl [&.scrolled]:border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Fellowship" className="h-8 w-auto" />
          </Link>
          <Link to="/login">
            <Button variant="outline" className="px-5">
              Se connecter
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-5xl px-6 pt-24 pb-28 text-center">
        {/* Warm gradient blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-16 -z-10 h-[480px] w-[700px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, hsl(24 72% 44% / 0.6) 0%, hsl(152 32% 40% / 0.3) 50%, transparent 100%)' }}
        />

        <span className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          La plateforme des artisans de festival
        </span>

        <h1 className="mx-auto max-w-3xl text-5xl leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl" style={{ letterSpacing: '-1px' }}>
          Les festivals,{' '}
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            ensemble.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          Découvre, organise et partage tes événements avec ta communauté d'artisans et de passionnés.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/login">
            <Button size="lg" className="gap-2 px-8 shadow-md shadow-primary/20">
              Je suis exposant
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="px-8">
              Découvrir les événements
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Features exposants ── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="mb-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Exposants
          </span>
        </div>
        <h2 className="mb-10 text-3xl">Pour les exposants</h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <FeatureCard
            icon={<Calendar className="h-6 w-6" />}
            title="Calendrier annuel"
            description="Gère toute ton année de festivals en un coup d'œil — vue mensuelle, statuts, deadlines."
            color="primary"
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Communauté"
            description="Vois où vont tes amis, partage tes dates, retrouve-toi sur les mêmes festivals."
            color="accent"
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="Avis & Bilans"
            description="Note les festivals, suis ta rentabilité, identifie ceux qui te font progresser."
            color="forest"
          />
        </div>
      </section>

      {/* ── Features public ── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="mb-2">
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Visiteurs
          </span>
        </div>
        <h2 className="mb-10 text-3xl">Pour les visiteurs</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <FeatureCard
            icon={<MapPin className="h-6 w-6" />}
            title="Découvre"
            description="Trouve des événements près de chez toi — marchés, foires, créateurs, artisans locaux."
            color="primary"
          />
          <FeatureCard
            icon={<Heart className="h-6 w-6" />}
            title="Suis tes artisans"
            description="Sache toujours où passent tes créateurs préférés et ne rate plus jamais leurs dates."
            color="accent"
          />
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-gradient-to-b from-background to-secondary/30 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-3 text-center text-3xl">Simple et transparent</h2>
          <p className="mb-14 text-center text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            Commence gratuitement, passe Pro quand tu veux.
          </p>

          <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Gratuit</p>
              <p className="mt-2 text-4xl">0 €</p>
              <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>pour toujours</p>

              <ul className="mt-8 space-y-3 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                {[
                  '7 événements par an',
                  'Vue calendrier annuelle',
                  '3 amis visibles',
                  'Score agrégé des festivals',
                  'Profil public basique',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/login" className="mt-8 block">
                <Button variant="outline" className="w-full">
                  Commencer gratuitement
                </Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent p-8 text-white shadow-xl">
              <span className="absolute right-5 top-5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                POPULAIRE
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70" style={{ fontFamily: "'Inter', sans-serif" }}>Pro</p>
              <p className="mt-2 text-4xl">7 €</p>
              <p className="mt-1 text-sm text-white/70" style={{ fontFamily: "'Inter', sans-serif" }}>par mois</p>

              <ul className="mt-8 space-y-3 text-sm text-white/80" style={{ fontFamily: "'Inter', sans-serif" }}>
                {[
                  'Événements illimités',
                  'Visibilité privé / amis / public',
                  'Amis illimités',
                  'Avis détaillés des exposants',
                  'Notes privées',
                  'Bilan post-événement (CA, coûts)',
                  'QR code personnalisé',
                  'Rappels deadlines inscription',
                  'Page embed (iframe)',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-yellow-300">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/login" className="mt-8 block">
                <Button className="w-full bg-white text-primary hover:bg-white/90">
                  Essayer Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          <p>Fellowship © 2026</p>
          <p className="mt-1">flw.sh</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode
  title: string
  description: string
  color: 'primary' | 'accent' | 'forest'
}) {
  const bgMap = {
    primary: 'bg-primary/8',
    accent: 'bg-accent/8',
    forest: 'bg-accent/8',
  }
  const iconBg = {
    primary: 'bg-primary/12 text-primary',
    accent: 'bg-accent/12 text-accent',
    forest: 'bg-accent/12 text-accent',
  }

  return (
    <div className={`rounded-2xl border border-border ${bgMap[color]} p-7`}>
      <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${iconBg[color]}`}>
        {icon}
      </div>
      <h3 className="mb-2 text-lg">{title}</h3>
      <p className="leading-relaxed text-muted-foreground text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
        {description}
      </p>
    </div>
  )
}
