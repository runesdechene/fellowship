import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Calendar, Users, BarChart3, MapPin, Heart } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#faf9f7' }}>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Fellowship" className="h-8 w-auto" />
          </Link>
          <Link to="/login">
            <Button variant="outline" className="rounded-full border-stone-300 px-5 text-stone-700 hover:bg-stone-50">
              Se connecter
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-32 -z-10 h-[420px] w-[700px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #c4b5fd 0%, #fdba74 60%, transparent 100%)' }}
        />

        <span
          className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
          style={{ background: '#f3e8ff', color: '#7c3aed' }}
        >
          La plateforme des artisans de festival
        </span>

        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-stone-900 sm:text-6xl">
          Les festivals,{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed, #f97316)' }}
          >
            ensemble.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone-500">
          Découvre, organise et partage tes événements avec ta communauté.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/login?role=exposant">
            <Button
              size="lg"
              className="rounded-full px-8 py-3 text-base font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none' }}
            >
              Je suis exposant
            </Button>
          </Link>
          <Link to="/login?role=public">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-stone-300 px-8 py-3 text-base font-semibold text-stone-700 hover:bg-stone-100"
            >
              Je découvre des événements
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Features exposants ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
            style={{ background: '#ede9fe', color: '#6d28d9' }}
          >
            Exposants
          </span>
        </div>
        <h2 className="mb-10 text-3xl font-bold text-stone-900">Pour les exposants</h2>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Card 1 */}
          <div
            className="rounded-3xl p-8 transition-shadow hover:shadow-lg"
            style={{ background: '#f5f3ff' }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: '#ede9fe' }}
            >
              <Calendar className="h-6 w-6" style={{ color: '#7c3aed' }} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-stone-900">Calendrier annuel</h3>
            <p className="leading-relaxed text-stone-500">
              Gère toute ton année de festivals en un coup d'œil — vue mensuelle, statuts, deadlines.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="rounded-3xl p-8 transition-shadow hover:shadow-lg"
            style={{ background: '#fff7ed' }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: '#ffedd5' }}
            >
              <Users className="h-6 w-6" style={{ color: '#ea580c' }} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-stone-900">Communauté</h3>
            <p className="leading-relaxed text-stone-500">
              Vois où vont tes amis, partage tes dates, retrouve-toi sur les mêmes festivals.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="rounded-3xl p-8 transition-shadow hover:shadow-lg"
            style={{ background: '#f0fdf4' }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: '#dcfce7' }}
            >
              <BarChart3 className="h-6 w-6" style={{ color: '#16a34a' }} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-stone-900">Avis &amp; Bilans</h3>
            <p className="leading-relaxed text-stone-500">
              Note les festivals, suis ta rentabilité, identifie les événements qui te font vraiment progresser.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features public ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
            style={{ background: '#fef3c7', color: '#b45309' }}
          >
            Visiteurs
          </span>
        </div>
        <h2 className="mb-10 text-3xl font-bold text-stone-900">Pour les visiteurs</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Card 1 */}
          <div
            className="rounded-3xl p-8 transition-shadow hover:shadow-lg"
            style={{ background: '#fef9f0' }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: '#fde68a' }}
            >
              <MapPin className="h-6 w-6" style={{ color: '#d97706' }} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-stone-900">Découvre</h3>
            <p className="leading-relaxed text-stone-500">
              Trouve des événements près de chez toi — marchés, foires, créateurs, artisans locaux.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="rounded-3xl p-8 transition-shadow hover:shadow-lg"
            style={{ background: '#fdf2f8' }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: '#fce7f3' }}
            >
              <Heart className="h-6 w-6" style={{ color: '#db2777' }} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-stone-900">Suis tes artisans</h3>
            <p className="leading-relaxed text-stone-500">
              Sache toujours où passent tes créateurs préférés et ne rate plus jamais leurs dates.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        className="py-24"
        style={{ background: 'linear-gradient(180deg, #faf9f7 0%, #f5f3ff 100%)' }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold text-stone-900">Simple et transparent</h2>
          <p className="mb-14 text-center text-stone-500">Commence gratuitement, passe Pro quand tu veux.</p>

          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-3xl border border-stone-200 bg-white p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-stone-400">Gratuit</p>
              <p className="mt-2 text-4xl font-extrabold text-stone-900">0 €</p>
              <p className="mt-1 text-sm text-stone-400">pour toujours</p>

              <ul className="mt-8 space-y-3 text-sm text-stone-600">
                {[
                  '7 événements par an',
                  'Vue calendrier annuelle',
                  '3 amis visibles',
                  'Score agrégé des festivals',
                  'Profil public basique',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-base" style={{ color: '#a3e635' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/login" className="mt-8 block">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-stone-300 font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Commencer gratuitement
                </Button>
              </Link>
            </div>

            {/* Pro */}
            <div
              className="relative rounded-3xl p-8 text-white shadow-xl"
              style={{ background: 'linear-gradient(145deg, #7c3aed, #a855f7 60%, #f97316)' }}
            >
              <span className="absolute right-6 top-6 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                POPULAIRE
              </span>
              <p className="text-sm font-semibold uppercase tracking-widest text-purple-200">Pro</p>
              <p className="mt-2 text-4xl font-extrabold">7 €</p>
              <p className="mt-1 text-sm text-purple-200">par mois</p>

              <ul className="mt-8 space-y-3 text-sm text-purple-100">
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
                    <span className="mt-0.5 flex-shrink-0 text-base text-yellow-300">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/login" className="mt-8 block">
                <Button
                  className="w-full rounded-full bg-white font-bold hover:bg-white/90"
                  style={{ color: '#7c3aed' }}
                >
                  Essayer Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-stone-400">
          <p>Fellowship © 2026</p>
          <p className="mt-1">flw.sh</p>
        </div>
      </footer>
    </div>
  )
}
