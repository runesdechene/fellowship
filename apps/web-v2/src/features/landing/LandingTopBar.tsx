/**
 * QUOI     — la barre du haut de la landing : la marque, quatre ancres, « Se connecter » et
 *            « Créer ma vitrine ».
 * POURQUOI — la landing n'a pas la barre latérale de l'app : elle est vue sans compte.
 * ATTENTION — « Créer ma vitrine » mène à la connexion, qui crée aussi les comptes (lot 10a).
 */
import { Link } from 'react-router-dom'

const ANCHORS = [
  { href: '#festivals', label: 'Les festivals' },
  { href: '#apport', label: 'Ce que ça t’apporte' },
  { href: '#pro', label: 'Le Pro' },
  { href: '#organisateurs', label: 'Organisateurs' },
] as const

export function LandingTopBar() {
  return (
    <header className="landing-bar">
      <img
        className="landing-bar__logo"
        src={`${import.meta.env.BASE_URL}icon.png`}
        alt="Fellowship"
      />
      <nav className="landing-bar__anchors" aria-label="Sections">
        {ANCHORS.map((anchor) => (
          <a key={anchor.href} href={anchor.href}>
            {anchor.label}
          </a>
        ))}
      </nav>
      <div className="landing-bar__actions">
        <Link className="landing-button" to="/connexion">
          Se connecter
        </Link>
        <Link className="landing-button landing-button--dark" to="/connexion">
          Créer ma vitrine
        </Link>
      </div>
    </header>
  )
}
