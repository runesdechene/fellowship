/**
 * QUOI     — la carte « Ma prochaine date » quand il n'y en a aucune : une affiche en squelette et
 *            « Ajouter mon premier festival ».
 * POURQUOI — maquette 2402:233 : la première chose à faire d'un compte neuf, à la place de la
 *            prochaine date.
 */
import { CirclePlus } from 'lucide-react'
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
          Ajoute une date : elle s’affiche ici, avec son compte à rebours.
        </p>
        <div className="next-date__chips">
          <Button
            variant="action"
            icon={<CirclePlus size={18} strokeWidth={1.75} />}
            onClick={() => go('/evenement/nouveau')}
          >
            Ajouter mon premier festival
          </Button>
        </div>
      </div>
    </div>
  )
}
