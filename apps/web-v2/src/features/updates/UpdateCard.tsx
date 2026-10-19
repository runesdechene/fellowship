/**
 * QUOI     — une mise à jour telle qu'on la lit : image, poids, version et date, titre, texte ; ce
 *            qui suit (cœurs, conversation) arrive en enfant.
 * POURQUOI — maquettes 2371:65 et 2371:707 : la grosse s'annonce (image, titre en serif, étiquette
 *            pleine), la petite reste sobre. L'aperçu de l'admin rend la même carte, sans enfant.
 */
import type { ReactNode } from 'react'
import { paragraphsOf, type UpdateWeight } from '@/lib/app-updates'
import { formatDayMonthShort } from '@/lib/dates'

export interface UpdateNote {
  version: string
  title: string
  body: string
  imageUrl: string | null
  weight: UpdateWeight
  publishedAt: string
}

export function UpdateCard({ note, children }: { note: UpdateNote; children?: ReactNode }) {
  const big = note.weight === 'big'
  return (
    <article className={big ? 'update-card update-card--big' : 'update-card'}>
      {note.imageUrl && <img className="update-card__image" src={note.imageUrl} alt="" />}
      <div className="update-card__body">
        <p className="update-card__meta">
          <span className="update-card__weight">
            {big ? 'Grosse mise à jour' : 'Petite mise à jour'}
          </span>
          <span>
            Version {note.version} · {formatDayMonthShort(new Date(note.publishedAt))}
          </span>
        </p>
        <h2 className="update-card__title">{note.title}</h2>
        {paragraphsOf(note.body).map((pieces, index) => (
          <p key={index} className="update-card__text">
            {pieces.map((piece, at) =>
              piece.href ? (
                <a key={at} href={piece.href} target="_blank" rel="noreferrer">
                  {piece.text}
                </a>
              ) : (
                piece.text
              ),
            )}
          </p>
        ))}
      </div>
      {children}
    </article>
  )
}
