/**
 * QUOI     — l'affiche d'un festival, partout où l'application en montre une. Absente : un fond
 *            de la couleur de sa catégorie et son icône, étouffée.
 * POURQUOI — planche « 2027 — Catégories · icônes » (2215:2), Uriel, 11/10/2026 : un rectangle
 *            vide « c'est moche », et un seul code pour toutes les affiches. Les couleurs sont des
 *            DONNÉES du back-office : seule raison du `style`, comme dans Tag.tsx.
 * ATTENTION — la taille, l'arrondi et la place de l'icône viennent du contexte (`className`) ;
 *            la grande affiche (PosterArt.tsx) y écrit sa date par `children`.
 */
import { createElement, type CSSProperties, type ReactNode } from 'react'
import { categoryIcon } from '@/lib/category-icons'
import { useCategoryColors } from '@/lib/useTagStyles'

interface PosterProps {
  imageUrl: string | null
  tags: readonly string[] | null
  className: string
  /** Ce qui s'écrit sur l'affiche absente (la date de la grande affiche). */
  children?: ReactNode
}

export function Poster({ imageUrl, tags, className, children }: PosterProps) {
  const colors = useCategoryColors(tags)
  if (imageUrl) return <img className={className} src={imageUrl} alt="" />

  return (
    <span
      className={`${className} poster-empty`}
      style={{ '--tag-bg': colors?.bgColor, '--tag-ink': colors?.textColor } as CSSProperties}
    >
      {createElement(categoryIcon(tags), {
        className: 'poster-empty__icon',
        strokeWidth: 1.5,
        'aria-hidden': true,
      })}
      {children}
    </span>
  )
}
