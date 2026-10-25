/**
 * QUOI     — en bas de la fiche vue sans compte : « Fini les événements dispersés », le nuage d'outils,
 *            puis « Créer mon compte gratuit ».
 * POURQUOI — décision du 23/10/2026 (maquette 2482:878) : on convainc par le concept, pas par les
 *            avis qu'on retient ; la séquence est celle de la landing, reprise telle quelle.
 */
import { Link, useLocation } from 'react-router-dom'
import { ToolsCompare } from '@/features/landing/ToolsCompare'
import { loginReturning } from '@/lib/welcome'

export function GuestPitch() {
  const { pathname } = useLocation()

  return (
    <section className="guest-pitch">
      <ToolsCompare
        lead="Fini les événements dispersés."
        rest="Fellowship aide les exposants à organiser leur saison."
      />
      <div className="guest-pitch__call">
        <Link
          className="landing-button landing-button--pill guest-pitch__button"
          to={loginReturning(pathname)}
        >
          Créer mon compte gratuit
        </Link>
        <p className="guest-pitch__note">Gratuit. Fait par des exposants, pour les exposants.</p>
      </div>
    </section>
  )
}
