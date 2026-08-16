import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'solid' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `solid` = fond crème (Ajouter une date) · `ghost` = icône seule (cloche). */
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
  if (variant === 'ghost') classes.push('button--ghost')
  if (block) classes.push('button--block')
  if (className) classes.push(className)

  return (
    <button type="button" className={classes.join(' ')} {...rest}>
      {icon}
      {children}
    </button>
  )
}
