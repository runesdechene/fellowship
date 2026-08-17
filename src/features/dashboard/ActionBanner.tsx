import { useState } from 'react'
import { PartyPopper, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTransitionNavigate } from '@/lib/navigation'
import type { DashboardReport } from './useDashboard'

/**
 * La seule bande qui réclame quelque chose. Elle disparaît dès que le bilan
 * est rempli.
 *
 * « Plus tard » et la croix ne l'écartent QUE pour la visite en cours : elle
 * revient au rechargement. Un rejet persistant serait un cul-de-sac — le
 * bilan resterait à faire, sans plus rien pour le rappeler.
 */
export function ActionBanner({ report }: { report: DashboardReport }) {
  const [hidden, setHidden] = useState(false)
  const go = useTransitionNavigate()

  if (hidden) return null

  return (
    <div>
      <p className="action-banner__eyebrow">Ta prochaine action</p>

      <div className="action-banner">
        <span className="action-banner__icon">
          <PartyPopper size={20} strokeWidth={1.75} />
        </span>

        <div className="action-banner__body">
          <p className="action-banner__title">Comment s’est passé {report.name} ?</p>
          <p className="action-banner__note">Note tes revenus, tes coûts et tes impressions.</p>
        </div>

        <div className="action-banner__actions">
          {/* Le bilan vivra sur la fiche de la date : c'est déjà là qu'on
              l'envoie, même si le formulaire reste à écrire. */}
          <Button variant="action" onClick={() => go(`/evenement/${report.eventId}`)}>
            Remplir mon bilan
          </Button>
          <Button onClick={() => setHidden(true)}>Plus tard</Button>
          <Button variant="bare" onClick={() => setHidden(true)} aria-label="Masquer">
            <X size={20} strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  )
}
