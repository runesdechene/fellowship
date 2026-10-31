/**
 * QUOI     — « Mon bilan » sur la fiche d'une date passée : bénéfice et CA en Pro, sous voile en
 *            gratuit.
 * POURQUOI — sorti d'EventPage (lot 11b) : la fiche approchait les 400 lignes, et ce bloc n'a
 *            de sens que pour un compte. Recettes chiffrées et verrouillées (`masked`) : le CA et le
 *            bénéfice sont masqués, les frais restent lisibles.
 */
import { ArrowRight } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProVeil } from '@/components/ui/ProVeil'
import { formatEuros, formatSignedEuros, MASKED_EUROS } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import { MyReportCard } from './MyReportCard'
import type { EventLedgerLine } from './useEvent'

interface MyReportBlockProps {
  eventId: string
  ledger: EventLedgerLine[]
  net: number | null
  revenue: number | null
  /** Des recettes chiffrées sans la clé : `net` et `revenue` sont incomplets. */
  masked: boolean
  pro: boolean
}

export function MyReportBlock({ eventId, ledger, net, revenue, masked, pro }: MyReportBlockProps) {
  const go = useTransitionNavigate()
  return (
    <section className="event-page__block">
      <div className="event-page__block-head">
        <h2 className="event-page__block-title">Mon bilan</h2>
        {pro && net !== null && revenue !== null && (
          <p className="event-page__block-total">
            <b>{masked ? MASKED_EUROS : formatSignedEuros(net)}</b> de bénéfice sur un CA de{' '}
            <b>{masked ? MASKED_EUROS : formatEuros(revenue)}</b>
          </p>
        )}
      </div>
      {pro ? (
        <>
          <MyReportCard ledger={ledger} masked={masked} />
          <button
            type="button"
            className="event-page__link-button"
            onClick={() => go(`/bilans/${eventId}`)}
          >
            Ouvrir le bilan
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        </>
      ) : (
        <ProVeil
          invitation={
            <button type="button" className="reports__invite" onClick={() => go('/bilans')}>
              <ProBadge />
              Tes bilans avec le Pro
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          }
        >
          <MyReportCard ledger={ledger} masked={masked} />
        </ProVeil>
      )}
    </section>
  )
}
