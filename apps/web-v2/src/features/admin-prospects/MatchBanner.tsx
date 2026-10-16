/**
 * QUOI     — le bandeau « N prospects viennent de créer leur compte ».
 * POURQUOI — Fellowship repère les inscriptions, un admin les confirme : la réussite se voit au lieu
 *            de s'effacer (Uriel, 16/10/2026, maquette 2356:522).
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
            ? '1 prospect vient de créer son compte'
            : `${count} prospects viennent de créer leur compte`}
        </p>
        <p className="prospect-banner__note">
          Confirme chacun : « Compte créé » se coche, et tu peux lui écrire un mot de bienvenue.
        </p>
      </div>
      <Button onClick={onOpen}>Voir et confirmer</Button>
    </aside>
  )
}
