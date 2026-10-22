/**
 * QUOI     — un bloc vide du tableau de bord : ce qu'il montrera, deux cartes en squelettes et, en
 *            gratuit, la pastille et « Découvrir le Pro ».
 * POURQUOI — maquette 2402:233 : « Pour toi » sans suggestion et « Mes bilans » sans bilan gardent
 *            leur place et disent ce qu'ils deviendront, au lieu de disparaître.
 */
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProBadge } from '@/components/ui/ProBadge'
import { SkeletonLine, SkeletonPoster } from '@/components/ui/Skeleton'
import { useTransitionNavigate } from '@/lib/navigation'

interface EmptyInviteProps {
  title: string
  note: string
  /** Le Pro a déjà ce que le bloc promet : ni pastille ni bouton. */
  pro: boolean
}

export function EmptyInvite({ title, note, pro }: EmptyInviteProps) {
  const go = useTransitionNavigate()

  return (
    <div className="empty-invite skeleton-card">
      <div className="empty-invite__text">
        {!pro && <ProBadge />}
        <p className="empty-invite__title">{title}</p>
        <p className="empty-invite__note">{note}</p>
      </div>
      <div className="empty-invite__cards" aria-hidden="true">
        {['first', 'second'].map((key) => (
          <span key={key} className="empty-invite__card">
            <SkeletonPoster className="empty-invite__poster" />
            <span className="empty-invite__lines">
              <SkeletonLine width="56px" tone="strong" />
              <SkeletonLine width="40px" />
              <SkeletonLine width="48px" tone="mid" />
            </span>
          </span>
        ))}
      </div>
      {!pro && (
        <Button variant="pro" onClick={() => go('/pro')}>
          Découvrir le Pro
          <ArrowRight size={14} strokeWidth={2} />
        </Button>
      )}
    </div>
  )
}
