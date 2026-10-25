/**
 * QUOI     — sous les prix du Pro, les encadrés « Bientôt · Pro » : ce qui arrive dans
 *            l'abonnement, sans supplément (la liste : lib/pro-soon.ts).
 * POURQUOI — Uriel, 23/10/2026 (maquette 2458:2329) : des encadrés à part plutôt que de mêler les
 *            fonctions à venir à la liste de ce que le Pro fait déjà. Le premier, sur toute la
 *            largeur (25/10/2026).
 */
import { PRO_SOON } from '@/lib/pro-soon'

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
        {PRO_SOON.map((item) => (
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
