/**
 * QUOI     — « Mon bilan » sur la fiche d'une date passée : bénéfice et CA en Pro, sous voile en
 *            gratuit.
 * POURQUOI — sorti d'EventPage (lot 11b) : la fiche approchait les 400 lignes, et ce bloc n'a
 *            de sens que pour un compte.
 */
import { ArrowRight } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProVeil } from '@/components/ui/ProVeil'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import { MyReportCard } from './MyReportCard'
import type { EventLedgerLine } from './useEvent'

interface MyReportBlockProps {
  eventId: string
  ledger: EventLedgerLine[]
  net: number | null
  revenue: number | null
  pro: boolean
}

export function MyReportBlock({ eventId, ledger, net, revenue, pro }: MyReportBlockProps) {
  const go = useTransitionNavigate()
  return (
    <section className="event-page__block">
      <div className="event-page__block-head">
        <h2 className="event-page__block-title">Mon bilan</h2>
        {pro && net !== null && revenue !== null && (
          <p className="event-page__block-total">
            <b>{formatSignedEuros(net)}</b> de bénéfice sur un CA de <b>{formatEuros(revenue)}</b>
          </p>
        )}
      </div>
      {pro ? (
        <>
          <MyReportCard ledger={ledger} />
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
          <MyReportCard ledger={ledger} />
        </ProVeil>
      )}
    </section>
  )
}
