/**
 * QUOI     — le bilan d'une date sur sa fiche : les lignes du registre, montant signé par le sens.
 * POURQUOI — sorti de EventPage.tsx (lot 8c) pour garder la fiche lisible et sous 400 lignes.
 */
import { formatEuros } from '@/lib/money'
import type { EventLedgerLine } from './useEvent'

/** Une ligne du registre : son intitulé, puis son montant signé par le sens. */
function LedgerRow({ line }: { line: EventLedgerLine }) {
  const incoming = line.direction === 'in'
  return (
    <li className="event-page__ledger-row">
      <span className="event-page__ledger-label">{line.label || line.category}</span>
      <span
        className={incoming ? 'event-page__ledger-amount--in' : 'event-page__ledger-amount--out'}
      >
        {incoming ? formatEuros(line.amount) : `− ${formatEuros(line.amount)}`}
      </span>
    </li>
  )
}

/** Les lignes du bilan d'une date, sur sa fiche. */
export function MyReportCard({ ledger }: { ledger: EventLedgerLine[] }) {
  return (
    <div className="event-page__card">
      {ledger.length > 0 ? (
        <ul className="event-page__ledger">
          {ledger.map((line) => (
            <LedgerRow key={line.id} line={line} />
          ))}
        </ul>
      ) : (
        <p className="event-page__state">Le bilan de cette date n’a pas encore été rempli.</p>
      )}
    </div>
  )
}
