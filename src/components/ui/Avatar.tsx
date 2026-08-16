import type { CSSProperties, ReactNode } from 'react'

interface AvatarProps {
  src?: string | null
  name?: string | null
  /** Diamètre en pixels. Par défaut, la taille définie en couche 2. */
  size?: number
  className?: string
}

/** Image ronde, avec repli sur l'initiale quand aucune image n'est disponible. */
export function Avatar({ src, name, size, className }: AvatarProps) {
  const style = size ? ({ '--avatar-size': `${size}px` } as CSSProperties) : undefined
  const classes = ['avatar', className].filter(Boolean).join(' ')

  if (!src) {
    return (
      <span className={`${classes} avatar--fallback`} style={style} aria-hidden="true">
        {(name ?? '?').charAt(0)}
      </span>
    )
  }

  return <img className={classes} style={style} src={src} alt="" />
}

export function AvatarStack({ children }: { children: ReactNode }) {
  return <span className="avatar-stack">{children}</span>
}
