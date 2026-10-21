/**
 * QUOI     — la carte d'une date : l'affiche, le nom, la période et la ville, puis son action
 *            (« Ça m'intéresse »).
 * POURQUOI — maquette 2363:14, posée à l'arrivée (« Ces festivals t'intéressent ? », 2392:271).
 */
import type { ReactNode } from 'react'
import { Poster } from './Poster'

interface DateCardProps {
  name: string
  when: string
  imageUrl: string | null
  tags: readonly string[] | null
  action: ReactNode
}

export function DateCard({ name, when, imageUrl, tags, action }: DateCardProps) {
  return (
    <article className="date-card">
      <Poster className="date-card__poster" imageUrl={imageUrl} tags={tags} />
      <p className="date-card__name">{name}</p>
      <p className="date-card__when">{when}</p>
      {action}
    </article>
  )
}
