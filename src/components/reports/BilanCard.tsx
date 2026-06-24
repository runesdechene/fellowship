import { useState } from 'react'
import { Lock, Pencil, ClipboardCheck, TrendingUp, TrendingDown, Sparkles, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useEventReport } from '@/hooks/use-reports'
import { useEventLedger } from '@/hooks/use-ledger'
import { ledgerProfit } from '@/lib/ledger'
import { BilanModal } from './BilanModal'
import './BilanCard.css'

interface Props {
  eventId: string
}

/**
 * Carte « Mon bilan post-festival » — visible côté EventPage en fest-main, après Avis.
 * Le parent ne la monte que si isExposant && isPast (gating contextuel).
 *
 * - Si plan Pro : état vide encourageant OU résumé chiffré ; clic → ouvre BilanModal.
 * - Si plan free : teaser Pro (le bilan reste une feature payante).
 */
export function BilanCard({ eventId }: Props) {
  const { currentActor, currentActorRow } = useAuth()
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'
  const { report, refetch } = useEventReport(eventId)
  const { entries, refetch: refetchEntries } = useEventLedger(eventId)
  const [open, setOpen] = useState(false)

  // État non-Pro : invite à passer Pro, pas de bouton remplir.
  if (!isPro) {
    return (
      <div className="glass-card event-section-card bilan-card bilan-card-locked">
        <div className="event-section-title"><ClipboardCheck strokeWidth={1.8} /> Mon bilan post-festival</div>
        <div className="bilan-locked">
          <Lock strokeWidth={1.8} />
          <p>
            Le bilan post-festival est une fonctionnalité <strong>Exposant Pro</strong>.
            Tracker ses revenus, ses coûts et ses retours d'expérience permet d'arbitrer ses
            festivals d'une année sur l'autre.
          </p>
        </div>
      </div>
    )
  }

  const hasReport = report != null || entries.length > 0
  const revenue = entries.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
  const costs = entries.filter(e => e.direction === 'out').reduce((s, e) => s + e.amount, 0)
  const profit = ledgerProfit(entries)
  const wins = report?.wins ?? []
  const improvements = report?.improvements ?? []

  return (
    <>
      <div className="glass-card event-section-card bilan-card">
        <div className="event-section-title bilan-title">
          <span><ClipboardCheck strokeWidth={1.8} /> Mon bilan post-festival</span>
          <span className="bilan-privacy"><Lock strokeWidth={2.2} /> Visible uniquement par toi</span>
        </div>

        {!hasReport ? (
          <div className="bilan-empty">
            <p>
              Tu y étais. <strong>Comment ça s'est passé ?</strong> Note tes revenus, tes
              coûts, ce qui a marché et ce qu'il faudrait améliorer la prochaine fois.
            </p>
            <button className="bilan-cta-primary" onClick={() => setOpen(true)}>
              <Plus strokeWidth={2.2} /> Remplir mon bilan
            </button>
          </div>
        ) : (
          <div className="bilan-summary">
            <div className="bilan-summary-figures">
              <div className="bilan-fig">
                <small>Revenus</small>
                <b>{revenue.toLocaleString('fr-FR')} €</b>
              </div>
              <div className="bilan-fig">
                <small>Coûts (stand + frais)</small>
                <b>{costs.toLocaleString('fr-FR')} €</b>
              </div>
              <div className={`bilan-fig bilan-fig-profit ${profit >= 0 ? 'pos' : 'neg'}`}>
                <small>Bénéfice</small>
                <b>
                  {profit >= 0 ? <TrendingUp strokeWidth={2.2} /> : <TrendingDown strokeWidth={2.2} />}
                  {profit.toLocaleString('fr-FR')} €
                </b>
              </div>
            </div>

            {(wins.length > 0 || improvements.length > 0) && (
              <div className="bilan-summary-text">
                {wins.length > 0 && (
                  <p className="bilan-wins">
                    <Sparkles strokeWidth={2} /> {wins.length} point{wins.length > 1 ? 's' : ''} fort{wins.length > 1 ? 's' : ''}
                  </p>
                )}
                {improvements.length > 0 && (
                  <p className="bilan-improvements">
                    {improvements.length} axe{improvements.length > 1 ? 's' : ''} d'amélioration
                  </p>
                )}
              </div>
            )}

            <button className="bilan-cta-edit" onClick={() => setOpen(true)}>
              <Pencil strokeWidth={2} /> Modifier mon bilan
            </button>
          </div>
        )}
      </div>

      {open && (
        <BilanModal
          eventId={eventId}
          onClose={() => setOpen(false)}
          onSaved={() => { refetch(); refetchEntries() }}
        />
      )}
    </>
  )
}
