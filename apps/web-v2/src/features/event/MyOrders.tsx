/**
 * QUOI     — les deux lignes de commandes de « Mon dossier » : sûres, potentielles.
 * POURQUOI — on les note dès qu'un client promet de passer, avant le festival : le bilan, lui,
 *            n'existe qu'après.
 * ATTENTION — rendu dans la liste d'InfoRows de MyDossier. Date chiffrée et verrouillée : montants
 *            masqués, et le bouton qui rouvre les recettes.
 */
import { PackageCheck, PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { DraftInput } from '@/components/ui/DraftInput'
import { InfoRow } from '@/components/ui/InfoRows'
import { MaskedAmount } from '@/components/ui/MaskedAmount'
import { UnlockDialog } from '@/features/reports/UnlockDialog'
import { UnlockRow } from '@/features/reports/UnlockRow'
import { formatEuros, parseAmount } from '@/lib/money'
import { ORDER_LABELS, type OrderKind } from '@/lib/report-writes'
import type { OrdersView } from './useOrders'

const ROWS = [
  { kind: 'sures', Icon: PackageCheck, sub: undefined },
  { kind: 'potentielles', Icon: PackageSearch, sub: 'Hors total' },
] as const satisfies readonly { kind: OrderKind; Icon: unknown; sub: string | undefined }[]

export function MyOrders({ view }: { view: OrdersView }) {
  const [unlocking, setUnlocking] = useState(false)
  const { orders, masked, save } = view
  if (!orders) return null

  return (
    <>
      {ROWS.map(({ kind, Icon, sub }) => (
        <InfoRow key={kind} Icon={Icon} label={ORDER_LABELS[kind]} sub={sub}>
          {masked ? (
            <MaskedAmount />
          ) : (
            <DraftInput
              label={`${ORDER_LABELS[kind]} en euros`}
              inputMode="decimal"
              placeholder="À renseigner"
              value={orders[kind] > 0 ? formatEuros(orders[kind]) : ''}
              onSave={(draft) => {
                const amount = parseAmount(draft)
                if (amount !== 'invalide') save(kind, amount ?? 0)
              }}
            />
          )}
        </InfoRow>
      ))}
      {masked && (
        <li>
          <UnlockRow
            onAsk={() => {
              setUnlocking(true)
            }}
          />
          {unlocking && (
            <UnlockDialog
              onDone={() => {
                setUnlocking(false)
              }}
            />
          )}
        </li>
      )}
    </>
  )
}
