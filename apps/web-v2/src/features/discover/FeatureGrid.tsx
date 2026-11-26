/**
 * QUOI     — « Bien plus qu'un calendrier. » : la grille des détails de l'application.
 * POURQUOI — maquette du 26/11/2026 : de vraies captures, jamais un écran redessiné.
 */
import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { CARDS, type Crop } from './cards'
import { SoonCard } from './SoonCard'

function Shot({ crop, title }: { crop: Crop | undefined; title: string }) {
  const shots = `${import.meta.env.BASE_URL}decouvrir/`
  if (!crop) {
    return (
      <div className="discover-card__phone">
        <img src={`${shots}telephone.webp`} alt={title} loading="lazy" />
      </div>
    )
  }
  return (
    <div
      className="discover-card__shot"
      style={
        {
          '--crop-x': crop.x,
          '--crop-y': crop.y,
          '--crop-width': crop.width,
          '--crop-height': crop.height,
        } as CSSProperties
      }
    >
      <img src={`${shots}${crop.image}.webp`} alt={title} loading="lazy" />
    </div>
  )
}

export function FeatureGrid() {
  return (
    <section id="fonctions" className="discover-grid">
      <h2 className="discover-title">Bien plus qu’un calendrier.</h2>
      <div className="discover-grid__cards">
        {CARDS.map(({ title, text, size, pro, crop }) => (
          <article key={title} className={`discover-card discover-card--${size}`}>
            <h3 className="discover-card__title">
              <Link to={pro ? '/pro' : '/connexion'}>
                {title}
                <ArrowRight size={15} strokeWidth={2} aria-hidden />
              </Link>
              {pro && <span className="discover-card__pro">Pro</span>}
            </h3>
            <p className="discover-card__text">{text}</p>
            <Shot crop={crop} title={title} />
          </article>
        ))}
        <SoonCard />
      </div>
    </section>
  )
}
