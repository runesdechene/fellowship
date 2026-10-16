/**
 * QUOI     — le bandeau « N prospects ont le même e-mail ou téléphone qu'un compte Fellowship ».
 * POURQUOI — le rapprochement automatique ne voit que les inscriptions ; ce bandeau montre le reste
 *            (comptes plus anciens, téléphone saisi plus tard), confirmé d'un clic (maquette 2343:2).
 */
import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function MatchBanner({ count, onOpen }: { count: number; onOpen: () => void }) {
  if (count === 0) return null
  return (
    <aside className="prospect-banner">
      <Link2 size={18} strokeWidth={1.75} aria-hidden="true" />
      <div className="prospect-banner__text">
        <p className="prospect-banner__title">
          {count === 1
            ? '1 prospect a le même e-mail ou téléphone qu’un compte Fellowship'
            : `${count} prospects ont le même e-mail ou téléphone qu’un compte Fellowship`}
        </p>
        <p className="prospect-banner__note">
          Rapprocher coche « Compte créé » et relie le prospect à la fiche de la personne.
        </p>
      </div>
      <Button onClick={onOpen}>Voir et rapprocher</Button>
    </aside>
  )
}
