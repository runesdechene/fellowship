/**
 * QUOI     — le bloc Paiements : les factures Stripe de l'enseigne (date, montant HT, pour quoi,
 *            état), quatre lignes puis « Tout voir ».
 * POURQUOI — Stripe seul connaît les paiements. Le bloc se charge à part : si Stripe répond mal,
 *            le message reste dans le bloc et la fiche s'ouvre quand même. L'e-mail du client
 *            remonte (`onCustomerEmail`) pour « Payée par » quand aucun compte n'est relié.
 */
import { Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminCard } from '@/components/ui/AdminCard'
import { fetchPayments, type Payments } from '@/lib/admin-functions'
import { formatFullDate } from '@/lib/dates'
import { formatPrice } from '@/lib/money'

const VISIBLE_ROWS = 4

const STATUSES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: '' },
  paid: { label: 'Payé', className: 'payment-status--paid' },
  open: { label: 'À payer', className: '' },
  void: { label: 'Annulé', className: '' },
  uncollectible: { label: 'Impayé', className: 'payment-status--late' },
}

interface Props {
  entityId: string
  onCustomerEmail: (email: string | null) => void
}

export function PaymentsCard({ entityId, onCustomerEmail }: Props) {
  const [payments, setPayments] = useState<Payments | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [all, setAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    onCustomerEmail(null) // jamais l'e-mail de l'enseigne précédente
    fetchPayments(entityId)
      .then((result) => {
        if (cancelled) return
        setPayments(result)
        onCustomerEmail(result.customerEmail)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        onCustomerEmail(null)
        setFailure(error instanceof Error ? error.message : 'Stripe ne répond pas')
      })
    return () => {
      cancelled = true
    }
  }, [entityId, onCustomerEmail])

  const invoices = payments?.invoices ?? []
  const shown = all ? invoices : invoices.slice(0, VISIBLE_ROWS)

  return (
    <AdminCard
      title="Paiements"
      Icon={Receipt}
      tone="sauge"
      action={
        invoices.length > VISIBLE_ROWS && (
          <button
            type="button"
            className="sheet-link sheet-link--button"
            onClick={() => setAll((open) => !open)}
          >
            {all ? 'Réduire' : 'Tout voir'}
          </button>
        )
      }
    >
      {failure && (
        <p className="sheet-form__error" role="alert">
          Les paiements n’ont pas pu être lus : {failure}
        </p>
      )}
      {!failure && !payments && <p className="payments__note">Chargement…</p>}
      {payments && invoices.length === 0 && <p className="payments__note">Aucun paiement</p>}
      {shown.length > 0 && (
        <table className="payments">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Montant</th>
              <th scope="col">Pour</th>
              <th scope="col">État</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((invoice) => {
              const date = formatFullDate(new Date(invoice.date))
              const status = invoice.status ? STATUSES[invoice.status] : undefined
              return (
                <tr key={invoice.id}>
                  <td>
                    {invoice.url ? (
                      <a className="sheet-link" href={invoice.url} target="_blank" rel="noreferrer">
                        {date}
                      </a>
                    ) : (
                      date
                    )}
                  </td>
                  <td>{formatPrice(invoice.amountCents)} HT</td>
                  <td>{invoice.label}</td>
                  <td className={`payment-status ${status?.className ?? ''}`}>
                    {status?.label ?? invoice.status ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </AdminCard>
  )
}
