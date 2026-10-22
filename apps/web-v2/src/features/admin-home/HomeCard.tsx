/**
 * QUOI     — un bloc de l'accueil de l'administration : carte blanche bordée, titre et précision
 *            en gris à sa suite.
 * POURQUOI — les quatre blocs de l'accueil (maquette 2448:233) n'ont pas de pastille d'icône,
 *            contrairement aux blocs des fiches (AdminCard).
 */
import type { ReactNode } from 'react'

interface HomeCardProps {
  title: string
  hint?: string
  className?: string
  children: ReactNode
}

export function HomeCard({ title, hint, className, children }: HomeCardProps) {
  return (
    <section className={['admin-card', 'home-card', className].filter(Boolean).join(' ')}>
      <h2 className="home-card__head">
        <span className="home-card__title">{title}</span>
        {hint && <span className="home-card__hint">{hint}</span>}
      </h2>
      {children}
    </section>
  )
}
