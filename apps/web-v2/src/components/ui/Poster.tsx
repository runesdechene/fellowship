/**
 * QUOI     — l'affiche d'un festival en vignette ; absente, un fond de la couleur de sa catégorie
 *            et son icône, étouffée, au centre.
 * POURQUOI — planche « 2027 — Catégories · icônes » (2215:2), Uriel, 11/10/2026 : un rectangle
 *            vide « c'est moche ». Les couleurs sont des DONNÉES du back-office : seule raison
 *            du `style`, comme dans Tag.tsx.
 */
import { createElement, type CSSProperties } from 'react'
import { categoryIcon } from '@/lib/category-icons'
import { useCategoryColors } from '@/lib/useTagStyles'

interface PosterProps {
  imageUrl: string | null
  tags: readonly string[] | null
  /** La classe de la vignette : sa taille et son arrondi viennent du contexte. */
  className: string
}

export function Poster({ imageUrl, tags, className }: PosterProps) {
  const colors = useCategoryColors(tags)
  if (imageUrl) return <img className={className} src={imageUrl} alt="" />

  return (
    <span
      className={`${className} poster-empty`}
      aria-hidden="true"
      style={{ '--tag-bg': colors?.bgColor, '--tag-ink': colors?.textColor } as CSSProperties}
    >
      {createElement(categoryIcon(tags), { className: 'poster-empty__icon', strokeWidth: 1.5 })}
    </span>
  )
}
