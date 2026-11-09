/**
 * QUOI     — les ventes d'une journée dépliée, et leur bouton « Facturée à un pro ».
 * POURQUOI — une vente facturée à la main dans Pennylane relève de la facture électronique : elle
 *            sort du total B2C, sinon elle serait déclarée deux fois.
 * ATTENTION — une journée partie ne se corrige pas : le bouton disparaît (locked).
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/money'
import { SOURCE_NAMES, type Sale } from '@/lib/reporting'

interface Props {
  sales: Sale[]
  locked: boolean
  onMark: (sale: Sale, invoiced: boolean) => Promise<string | null>
}

export function DaySales({ sales, locked, onMark }: Props) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function mark(sale: Sale) {
    setBusy(true)
    setProblem(await onMark(sale, !sale.invoiced))
    setBusy(false)
  }

  return (
    <div className="reporting-sales">
      <ul className="reporting-sales__list">
        {sales.map((sale) => (
          <li
            key={`${sale.source}-${sale.reference}`}
            className={sale.invoiced ? 'reporting-sales__row is-invoiced' : 'reporting-sales__row'}
          >
            <span className="reporting-sales__source">{SOURCE_NAMES[sale.source]}</span>
            {sale.link ? (
              <a href={sale.link} target="_blank" rel="noreferrer">
                {sale.reference}
              </a>
            ) : (
              <span>{sale.reference}</span>
            )}
            <span className="reporting-sales__amount">{formatPrice(sale.ttc)}</span>
            <span className="reporting-sales__action">
              {sale.invoiced && <span>Facturée à un pro, hors du total</span>}
              {!locked && (
                <Button disabled={busy} onClick={() => void mark(sale)}>
                  {sale.invoiced ? 'Remettre dans le total' : 'Facturée à un pro'}
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {problem && <p className="admin-page__error">{problem}</p>}
    </div>
  )
}
