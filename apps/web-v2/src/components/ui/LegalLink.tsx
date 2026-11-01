/**
 * QUOI     — le lien vers les pages légales, sous l'interrupteur Clair / Sombre (barre latérale et
 *            menu du téléphone).
 * POURQUOI — les CGU, CGV et la confidentialité doivent rester joignables une fois connecté
 *            (Uriel, 01/11/2026) ; le menu des pages légales mène de l'une à l'autre.
 */
import { Link } from 'react-router-dom'

export function LegalLink({ onClick }: { onClick?: () => void }) {
  return (
    <Link className="legal-link" to="/legal/mentions-legales" onClick={onClick}>
      Mentions légales et conditions
    </Link>
  )
}
