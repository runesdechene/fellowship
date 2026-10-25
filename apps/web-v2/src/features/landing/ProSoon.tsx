/**
 * QUOI     — sous les prix du Pro, quatre encadrés « Bientôt · Pro » : ce qui arrive dans
 *            l'abonnement, sans supplément.
 * POURQUOI — Uriel, 23/10/2026 (maquette 2458:2329) : des encadrés à part plutôt que de mêler les
 *            fonctions à venir à la liste de ce que le Pro fait déjà.
 * ATTENTION — rien de tout ça n'existe encore : le sceau le dit. Ne retirer un encadré que quand
 *            la fonction est livrée : elle rejoint alors la liste du Pro. Seulement ce qui sort dans les prochains mois (Uriel, 25/10/2026) : l'agent IA et le
 *            calendrier personnalisé sont retirés, trop lointains.
 */
import { FileText, Megaphone, MousePointerClick, Radar } from 'lucide-react'

const SOON = [
  {
    icon: MousePointerClick,
    title: 'L’inscription en un clic',
    text: 'Si l’orga utilise Fellowship, ton dossier part tout seul.',
  },
  {
    icon: FileText,
    title: 'Le dossier PDF rempli pour toi',
    text: 'Tu déposes le PDF : enseigne, SIRET, stand, déjà reportés.',
  },
  {
    icon: Radar,
    title: 'La veille des festivals',
    text: 'Fellowship parcourt le web et te propose les dates qui te ressemblent.',
  },
  {
    icon: Megaphone,
    title: 'Tes annonces sur les réseaux',
    text: 'Une story et un post prêts pour chaque festival où tu vas.',
  },
] as const

export function ProSoon() {
  return (
    <section className="landing-pro-soon" aria-labelledby="landing-pro-soon-title">
      <p className="landing-pro-soon__head">
        <span className="landing-seal">Bientôt · Pro</span>
        <span id="landing-pro-soon-title">
          Ce qui arrive dans le Pro, inclus dans ton abonnement.
        </span>
      </p>
      <ul className="landing-pro-soon__list">
        {SOON.map((item) => (
          <li key={item.title}>
            <item.icon size={24} strokeWidth={1.8} aria-hidden />
            <span>
              <strong>{item.title}</strong>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
