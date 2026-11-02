/**
 * QUOI     — l'affiche d'un festival, partout où l'application en montre une. Absente : une fausse
 *            affiche dessinée pour sa catégorie ; avec `cover`, elle porte aussi le cadre, la
 *            ville, le nom et les dates, comme sur la planche.
 * POURQUOI — planche « 2027 — Affiches par défaut » (2704:287), Uriel, 02/11/2026 : les affiches
 *            inventées du flyer, une par catégorie, à la place de l'icône étouffée.
 * ATTENTION — la taille et l'arrondi viennent du contexte (`className`) ; l'affiche se dessine
 *            dans une feuille au format de la planche, centrée, pour ne jamais être rognée. Le
 *            texte s'efface de lui-même quand l'affiche devient trop petite (poster-cover.css).
 */
import type { CSSProperties } from 'react'
import { posterCategory, posterMotif } from '@/lib/poster-category'
import { posterThumb } from '@/lib/poster-thumb'

/** Ce qui s'écrit sur la fausse affiche. */
export interface PosterText {
  name: string
  city: string | null
  dates: string
}

interface PosterProps {
  imageUrl: string | null
  tags: readonly string[] | null
  className: string
  cover?: PosterText
}

export function Poster({ imageUrl, tags, className, cover }: PosterProps) {
  // Assez large pour la plus grande affiche posée dans une page, en écran dense.
  if (imageUrl) return <img className={className} src={posterThumb(imageUrl, 800, 80)} alt="" />

  const category = posterCategory(tags)

  return (
    <span className={`${className} poster-cover`} data-category={category}>
      <span
        className={cover ? 'poster-cover__sheet poster-cover__sheet--text' : 'poster-cover__sheet'}
      >
        <img className="poster-cover__motif" src={posterMotif(category)} alt="" />
        {cover && <PosterLines cover={cover} />}
      </span>
    </span>
  )
}

/** La ville en haut, le nom sous le dessin, les dates en bas. */
function PosterLines({ cover }: { cover: PosterText }) {
  // Une donnée pour le CSS : la taille du titre se règle sur son plus long mot et sa longueur.
  const longest = Math.max(...cover.name.split(/\s+/).map((word) => word.length))
  return (
    <>
      {cover.city && <span className="poster-cover__city">{cover.city}</span>}
      <span
        className="poster-cover__title"
        style={{ '--cover-longest': longest, '--cover-length': cover.name.length } as CSSProperties}
      >
        <span className="poster-cover__name">{cover.name}</span>
      </span>
      <span className="poster-cover__dates">{cover.dates}</span>
    </>
  )
}
