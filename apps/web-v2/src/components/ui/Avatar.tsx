import type { ReactNode } from 'react'

interface AvatarProps {
  src?: string | null
  name?: string | null
  /**
   * La taille ne se passe PAS en props : elle vient du CSS, en redéfinissant
   * --avatar-size depuis la classe du contexte (voir src/styles/2-semantic.css).
   */
  className?: string
}

/** Image ronde, avec repli sur l'initiale quand aucune image n'est disponible. */
export function Avatar({ src, name, className }: AvatarProps) {
  const classes = ['avatar', className].filter(Boolean).join(' ')

  if (!src) {
    return (
      <span className={`${classes} avatar--fallback`} aria-hidden="true">
        {(name ?? '?').charAt(0)}
      </span>
    )
  }

  return <img className={classes} src={src} alt="" />
}

export function AvatarStack({ children }: { children: ReactNode }) {
  return <span className="avatar-stack">{children}</span>
}
