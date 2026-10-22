/**
 * QUOI     — les formes grises d'un bloc vide : une ligne, un point, une affiche illustrée.
 * POURQUOI — maquette 2402:233 (22/10/2026) : un bloc sans contenu garde sa forme en squelettes,
 *            ton sur ton, plutôt que de disparaître ou de montrer de faux festivals.
 * ATTENTION — purement décoratif : le bloc qui les contient les cache aux lecteurs d'écran.
 */
import type { CSSProperties } from 'react'

type Tone = 'strong' | 'mid' | 'soft'

/** Une ligne de texte devinée ; `strong` pour un titre. */
export function SkeletonLine({ width, tone = 'soft' }: { width: string; tone?: Tone }) {
  return (
    <span
      className={`skeleton-line skeleton-line--${tone}`}
      style={{ '--skeleton-width': width } as CSSProperties}
    />
  )
}

/** Le point d'un statut. */
export function SkeletonDot() {
  return <span className="skeleton-dot" />
}

/** Une affiche : un soleil, une colline, deux lignes de titre. */
export function SkeletonPoster({ className }: { className?: string }) {
  return (
    <span className={className ? `skeleton-poster ${className}` : 'skeleton-poster'}>
      <span className="skeleton-poster__title" />
      <span className="skeleton-poster__subtitle" />
    </span>
  )
}
