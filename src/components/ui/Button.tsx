import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'solid' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `solid` = icône + libellé (Ajouter une date) · `icon` = carré, icône seule (cloche). */
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
  if (variant === 'icon') classes.push('button--icon')
  if (block) classes.push('button--block')
  if (className) classes.push(className)

  return (
    <button type="button" className={classes.join(' ')} {...rest}>
      {icon}
      {children}
    </button>
  )
}
