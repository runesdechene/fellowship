/**
 * QUOI     — les formes grises d'un bloc vide : une ligne, un point, une affiche illustrée, des
 *            statistiques (une courbe qui monte, des barres).
 * POURQUOI — maquette 2402:233 (22/10/2026) : un bloc sans contenu garde sa forme en squelettes,
 *            ton sur ton, plutôt que de disparaître ou de montrer de faux festivals.
 * ATTENTION — purement décoratif : le bloc qui les contient les cache aux lecteurs d'écran.
 */
import { useId, type CSSProperties } from 'react'

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

/** Des statistiques devinées : une courbe de bénéfice qui monte, et une barre par festival. */
export function SkeletonChart({ className }: { className?: string }) {
  // Un identifiant par graphique : deux dégradés de même nom se marcheraient dessus.
  const fade = useId()

  return (
    <svg
      className={className ? `skeleton-chart ${className}` : 'skeleton-chart'}
      viewBox="0 0 260 96"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="skeleton-chart__fade-top" />
          <stop offset="1" className="skeleton-chart__fade-bottom" />
        </linearGradient>
      </defs>
      <line className="skeleton-chart__axis" x1="0" y1="88" x2="150" y2="88" />
      <line className="skeleton-chart__guide" x1="0" y1="58" x2="150" y2="58" />
      <line className="skeleton-chart__guide" x1="0" y1="28" x2="150" y2="28" />
      <path
        d="M0 78 C 20 76, 30 64, 50 66 S 80 50, 100 44 S 130 20, 150 14 L150 88 L0 88 Z"
        fill={`url(#${fade})`}
      />
      <path
        className="skeleton-chart__curve"
        d="M0 78 C 20 76, 30 64, 50 66 S 80 50, 100 44 S 130 20, 150 14"
      />
      <circle className="skeleton-chart__point" cx="150" cy="14" r="5" />
      <rect className="skeleton-chart__bar" x="176" y="60" width="12" height="28" rx="4" />
      <rect
        className="skeleton-chart__bar skeleton-chart__bar--mid"
        x="194"
        y="44"
        width="12"
        height="44"
        rx="4"
      />
      <rect className="skeleton-chart__bar" x="212" y="52" width="12" height="36" rx="4" />
      <rect
        className="skeleton-chart__bar skeleton-chart__bar--strong"
        x="230"
        y="26"
        width="12"
        height="62"
        rx="4"
      />
      <rect
        className="skeleton-chart__bar skeleton-chart__bar--mid"
        x="248"
        y="38"
        width="12"
        height="50"
        rx="4"
      />
    </svg>
  )
}
