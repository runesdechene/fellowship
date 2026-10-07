/**
 * QUOI     — cinq étoiles, pleines jusqu'à la note : l'affichage d'une note d'avis.
 * POURQUOI — la note globale de la fiche et l'aperçu d'un avis se dessinent pareil.
 */
import { Star } from 'lucide-react'
import { formatScore, starsOf } from '@/lib/reviews'

export function Stars({ score }: { score: number }) {
  const full = starsOf(score)
  return (
    <span className="stars" aria-label={`${formatScore(score)} sur 5`}>
      {[1, 2, 3, 4, 5].map((rank) => (
        <Star
          key={rank}
          size={13}
          strokeWidth={1.8}
          className={rank <= full ? 'stars__star stars__star--on' : 'stars__star'}
        />
      ))}
    </span>
  )
}
