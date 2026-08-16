import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'solid' | 'icon' | 'action' | 'bare'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `solid`  fond crème, le cas courant
   * `icon`   carré, icône seule, sur fond crème (la cloche)
   * `action` fond plein coloré — réservé à l'action réclamée par l'interface
   * `bare`   sans fond ni surface (la croix de fermeture)
   */
  variant?: Variant
  block?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'solid',
  block = false,
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = ['button']
  if (variant !== 'solid') classes.push(`button--${variant}`)
  if (block) classes.push('button--block')
  if (className) classes.push(className)

  return (
    <button type="button" className={classes.join(' ')} {...rest}>
      {icon}
      {children}
    </button>
  )
}
