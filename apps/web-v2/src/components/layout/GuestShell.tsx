/**
 * QUOI     — le cadre d'une page vue sans compte (la fiche d'un festival) : dans la colonne de
 *            gauche, le retour et le logo, puis la page ; à droite, l'affiche posée avec une marge ;
 *            en haut à droite, sur l'affiche, « Se connecter » et « Commencer ».
 * POURQUOI — Uriel, 25/10/2026 : l'affiche monte jusqu'en haut, la barre se réduit au logo, la flèche
 *            dit qu'on revient à l'accueil, les boutons restent où ils étaient au début.
 * ATTENTION — le PageChromeProvider enveloppe tout : la fiche déclare son affiche, le mur la rend.
 *            Les boutons vivent hors de la colonne, sans quoi le mur passerait par-dessus.
 */
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/ui/Wordmark'
import { PageChromeProvider } from '@/lib/page-chrome'
import { PosterWall } from './PosterWall'

export function GuestShell({ children }: { children: ReactNode }) {
  return (
    <PageChromeProvider>
      <div className="guest-shell">
        <main className="guest-shell__main">
          <header className="guest-bar">
            <Link
              className="button button--icon"
              to="/"
              aria-label="Retour à l'accueil"
              title="Accueil"
            >
              <ArrowLeft size={20} strokeWidth={1.75} />
            </Link>
            <Link className="guest-bar__brand" to="/" aria-label="Fellowship, accueil">
              <Wordmark />
            </Link>
          </header>
          {children}
        </main>
        <PosterWall />
        <div className="guest-shell__actions">
          <Link className="landing-button landing-button--glass" to="/connexion">
            Se connecter
          </Link>
          <Link className="landing-button landing-button--cream" to="/connexion">
            Commencer
          </Link>
        </div>
      </div>
    </PageChromeProvider>
  )
}
