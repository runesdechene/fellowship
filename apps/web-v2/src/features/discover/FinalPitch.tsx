/**
 * QUOI     — le dernier appel : « Ta prochaine saison commence ici. », puis les papiers à jeter.
 * POURQUOI — maquette du 26/11/2026.
 */
import { Link } from 'react-router-dom'
import { PaperToss } from './PaperToss'

export function FinalPitch() {
  return (
    <section className="discover-final">
      <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" />
      <h2>Ta prochaine saison commence ici.</h2>
      <p>Essaie Fellowship en deux minutes. Gratuit, sans carte bancaire.</p>
      <Link className="discover-button discover-button--brand" to="/connexion">
        Commencer gratuitement
      </Link>
      <PaperToss />
    </section>
  )
}
