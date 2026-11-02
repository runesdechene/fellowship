/**
 * QUOI     — l'affiche d'un festival, partout où l'application en montre une. Absente : une fausse
 *            affiche dessinée pour sa catégorie, et le nom du festival quand on le donne.
 * POURQUOI — planche « 2027 — Affiches par défaut » (2704:287), Uriel, 02/11/2026 : les affiches
 *            inventées du flyer, une par catégorie, à la place de l'icône étouffée.
 * ATTENTION — la taille et l'arrondi viennent du contexte (`className`). Le nom ne s'écrit que sur
 *            la grande affiche (PosterArt.tsx) : sur une vignette, le dessin seul. La longueur de
 *            son mot le plus long est une donnée passée au CSS, qui en tire la taille du titre.
 */
import type { CSSProperties } from 'react'
import { posterCategory, posterMotif } from '@/lib/poster-category'
import { posterThumb } from '@/lib/poster-thumb'

interface PosterProps {
  imageUrl: string | null
  tags: readonly string[] | null
  className: string
  /** Le nom écrit sur l'affiche absente (la grande affiche seulement). */
  title?: string
}

export function Poster({ imageUrl, tags, className, title }: PosterProps) {
  // Assez large pour la plus grande affiche posée dans une page, en écran dense.
  if (imageUrl) return <img className={className} src={posterThumb(imageUrl, 800, 80)} alt="" />

  const category = posterCategory(tags)
  const longest = title ? Math.max(...title.split(/\s+/).map((word) => word.length)) : 0

  return (
    <span
      className={`${className} poster-cover${title ? ' poster-cover--titled' : ''}`}
      data-category={category}
    >
      <img className="poster-cover__motif" src={posterMotif(category)} alt="" />
      {title && (
        <span
          className="poster-cover__title"
          style={{ '--cover-longest': longest } as CSSProperties}
        >
          {title}
        </span>
      )}
    </span>
  )
}
