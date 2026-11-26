/**
 * QUOI     — la barre qui reste en haut de la landing : la marque, trois chapitres, la
 *            connexion et « Commencer ».
 * POURQUOI — maquette du 26/11/2026.
 */
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/ui/Wordmark'

export function DiscoverNav() {
  return (
    <header className="discover-nav">
      <div className="discover-nav__inner">
        <a href="#haut" aria-label="Fellowship, haut de page">
          <Wordmark className="discover-wordmark" />
        </a>
        <nav className="discover-nav__links">
          <a href="#fonctions">Fonctionnalités</a>
          <a href="#tarif">Tarif</a>
          <a href="#questions">Questions</a>
          <Link to="/connexion">Se connecter</Link>
          <Link className="discover-button discover-button--ink discover-button--s" to="/connexion">
            Commencer
          </Link>
        </nav>
      </div>
    </header>
  )
}
