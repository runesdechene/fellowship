import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateParticipation } from '@/hooks/use-participations'
import type { Participation } from '@/types/database'
import type { PaymentEntry } from '@/types/database'

interface PaymentTrackerProps {
  participation: Participation
  onUpdate: (p: Participation) => void
}

export function PaymentTracker({ participation, onUpdate }: PaymentTrackerProps) {
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')
  const [totalCost, setTotalCost] = useState(participation.total_cost?.toString() ?? '')
  const [editingCost, setEditingCost] = useState(!participation.total_cost)

  const payments: PaymentEntry[] = (participation.payments as PaymentEntry[] | null) ?? []
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const cost = participation.total_cost ?? 0

  const handleSetCost = async () => {
    const val = parseFloat(totalCost)
    if (isNaN(val) || val <= 0) return
    const { data } = await updateParticipation(participation.id, { total_cost: val })
    if (data) { onUpdate(data); setEditingCost(false) }
  }

  const handleAddPayment = async () => {
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) return
    const newPayment: PaymentEntry = {
      amount: val,
      date: new Date().toISOString().split('T')[0],
      label: label || 'Versement',
    }
    const updated = [...payments, newPayment]
    const { data } = await updateParticipation(participation.id, { payments: updated as unknown as Participation['payments'] })
    if (data) { onUpdate(data); setAmount(''); setLabel(''); setShowForm(false) }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Receipt className="h-3.5 w-3.5" />
        Paiement
      </div>

      {editingCost ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Coût total (€)"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            value={totalCost}
            onChange={e => setTotalCost(e.target.value)}
          />
          <Button size="sm" onClick={handleSetCost}>OK</Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-bold text-foreground">{totalPaid}€</span>
            <span className="text-muted-foreground"> / {cost}€</span>
          </div>
          <button onClick={() => setEditingCost(true)} className="text-xs text-primary hover:underline">Modifier</button>
        </div>
      )}

      {cost > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${Math.min(100, (totalPaid / cost) * 100)}%` }}
          />
        </div>
      )}

      {payments.length > 0 && (
        <div className="space-y-1">
          {payments.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{p.label} — {new Date(p.date).toLocaleDateString('fr-FR')}</span>
              <span className="font-medium">{p.amount}€</span>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Montant"
            className="w-24 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Acompte, solde..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <Button size="sm" onClick={handleAddPayment}>OK</Button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="h-3 w-3" />
          Ajouter un versement
        </button>
      )}
    </div>
  )
}
