/**
 * QUOI     — la carte « Une plateforme en constante évolution », la dernière de la grille de /decouvrir-v2.
 * POURQUOI — Uriel, 26/11/2026 : annoncer ce qui arrive. La liste est celle de /decouvrir et de
 *            /pro (lib/pro-soon.ts) : une fonction livrée en sort pour les trois pages.
 */
import { PRO_SOON } from '@/lib/pro-soon'

export function SoonCard() {
  return (
    <article className="discover-card discover-card--half discover-soon">
      <h3 className="discover-card__title">Une plateforme en constante évolution</h3>
      <p className="discover-card__text">Bientôt dans le Pro, inclus dans ton abonnement.</p>
      <ul className="discover-soon__list">
        {PRO_SOON.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <Icon size={20} strokeWidth={1.8} aria-hidden />
            <span>
              <strong>{title}</strong>
              {text}
            </span>
          </li>
        ))}
      </ul>
    </article>
  )
}
