/**
 * QUOI     — la barre du haut de la landing, posée sur le brun de l'ouverture : la marque, quatre
 *            ancres, « Se connecter » et « Créer ma vitrine ».
 * POURQUOI — maquette 2290:2 ; la landing n'a pas la barre latérale de l'app : elle est vue sans
 *            compte.
 * ATTENTION — « Créer ma vitrine » mène à la connexion, qui crée aussi les comptes (lot 10a).
 */
import { Link } from 'react-router-dom'

const ANCHORS = [
  { href: '#assistant', label: 'Les festivals' },
  { href: '#communaute', label: 'Ce que ça t’apporte' },
  { href: '#pro', label: 'Le Pro' },
  { href: 'mailto:appfellowship@pm.me', label: 'Organisateurs' },
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
          <a key={anchor.label} href={anchor.href}>
            {anchor.label}
          </a>
        ))}
      </nav>
      <div className="landing-bar__actions">
        <Link className="landing-button landing-button--glass" to="/connexion">
          Se connecter
        </Link>
        <Link className="landing-button landing-button--cream" to="/connexion">
          Créer ma vitrine
        </Link>
      </div>
    </header>
  )
}
