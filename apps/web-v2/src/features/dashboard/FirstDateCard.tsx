/**
 * QUOI     — la carte « Ma prochaine date » quand il n'y en a aucune : une affiche en squelette et
 *            « Explorer les festivals ».
 * POURQUOI — maquette 2402:233 : la première chose à faire d'un compte neuf, à la place de la
 *            prochaine date. L'Explorer et non l'ajout d'une date (Uriel, 22/10/2026) : on trouve son
 *            festival plus qu'on ne le crée, et « Ajouter une date » vit déjà en haut à droite.
 */
import { Telescope } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SkeletonPoster } from '@/components/ui/Skeleton'
import { useTransitionNavigate } from '@/lib/navigation'

export function FirstDateCard() {
  const go = useTransitionNavigate()

  return (
    <div className="first-date skeleton-card">
      <SkeletonPoster className="first-date__poster" />
      <div className="next-date__body">
        <p className="next-date__title">Ton premier festival</p>
        <p className="next-date__meta">
          Trouve un festival où exposer : il s’affiche ici, avec son compte à rebours.
        </p>
        <div className="next-date__chips">
          <Button
            variant="action"
            icon={<Telescope size={18} strokeWidth={1.75} />}
            onClick={() => go('/explorer')}
          >
            Explorer les festivals
          </Button>
        </div>
      </div>
    </div>
  )
}
