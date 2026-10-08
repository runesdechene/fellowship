/**
 * QUOI     — les recettes et dépenses d'un bilan : deux groupes avec leur total, chaque ligne
 *            modifiable sur place, et la ligne d'ajout (catégorie, montant, « Ajouter »).
 * POURQUOI — chaque ligne s'enregistre aussitôt, comme le dossier d'une date : on tape, on passe.
 * ATTENTION — la ligne « depuis la fiche » est le prix de la place de Mon dossier : useReport
 *            l'écrit par set_stand_amount. Vider un montant retire la ligne ; un montant qui ne
 *            veut rien dire ne touche à rien et le dit.
 */
import {
  BedDouble,
  Circle,
  Fuel,
  HandCoins,
  Plus,
  ShoppingBag,
  Tent,
  Undo2,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { DraftInput } from '@/components/ui/DraftInput'
import { Select } from '@/components/ui/Select'
import { formatEuros, parseAmount } from '@/lib/money'
import { CATEGORIES, categoryLabel } from '@/lib/report-writes'
import type { LedgerCategory } from '@/types/database'
import peageIcon from '@/assets/peage.svg'
import type { ReportActions, ReportEntry } from './useReport'

const ICONS: Partial<Record<LedgerCategory, LucideIcon>> = {
  ventes: ShoppingBag,
  remboursement: Undo2,
  cachet: HandCoins,
  emplacement: Tent,
  essence: Fuel,
  hebergement: BedDouble,
  repas: Utensils,
  autre: Circle,
}

function CategoryIcon({ category }: { category: LedgerCategory }) {
  const Icon = ICONS[category]
  return (
    <span className="ledger__icon">
      {Icon ? (
        <Icon size={15} strokeWidth={1.5} />
      ) : (
        // Le péage n'a pas d'équivalent dans lucide : l'icône de la maquette, teinte par le CSS.
        <span className="ledger__mask" style={{ '--icon': `url(${peageIcon})` } as CSSProperties} />
      )}
    </span>
  )
}

function LedgerLine({
  entry,
  actions,
  onInvalid,
}: {
  entry: ReportEntry
  actions: ReportActions
  onInvalid: (invalid: boolean) => void
}) {
  return (
    <div className="ledger__line">
      <CategoryIcon category={entry.category} />
      <span className="ledger__label">
        {categoryLabel(entry.category)}
        {entry.source === 'stepper' && <span className="ledger__badge">depuis la fiche</span>}
      </span>
      <span className="ledger__amount">
        <span aria-hidden="true">{entry.direction === 'in' ? '+' : '−'}</span>
        <DraftInput
          className="ledger__input"
          label={`Montant — ${categoryLabel(entry.category)}`}
          inputMode="decimal"
          value={formatEuros(entry.amount)}
          onSave={(draft) => {
            const amount = parseAmount(draft)
            onInvalid(amount === 'invalide')
            if (amount === 'invalide') return
            if (amount === null || amount === 0) actions.removeLine(entry)
            else actions.setAmount(entry, amount)
          }}
        />
      </span>
      <button
        type="button"
        className="ledger__remove"
        aria-label={`Retirer la ligne ${categoryLabel(entry.category)}`}
        onClick={() => {
          actions.removeLine(entry)
        }}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  )
}

function AddLine({
  actions,
  onInvalid,
}: {
  actions: ReportActions
  onInvalid: (invalid: boolean) => void
}) {
  const [category, setCategory] = useState<LedgerCategory>('autre')
  const [draft, setDraft] = useState('')
  const amount = parseAmount(draft)
  const ready = typeof amount === 'number' && amount > 0

  return (
    <form
      className="ledger__add"
      onSubmit={(event) => {
        event.preventDefault()
        onInvalid(amount === 'invalide')
        if (!ready) return
        actions.addLine(category, amount)
        setDraft('')
      }}
    >
      <Select
        className="ledger__category"
        label="Catégorie"
        value={category}
        options={CATEGORIES.map((entry) => ({ value: entry.value, label: entry.label }))}
        onChange={setCategory}
      />
      <label className="ledger__field">
        <span className="ledger__field-label">Montant</span>
        <input
          className="ledger__field-input"
          inputMode="decimal"
          placeholder="0 €"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
        />
      </label>
      <button type="submit" className="ledger__submit" disabled={draft.trim() === ''}>
        <Plus size={14} strokeWidth={2} />
        Ajouter
      </button>
    </form>
  )
}

export function Ledger({ entries, actions }: { entries: ReportEntry[]; actions: ReportActions }) {
  const [invalid, setInvalid] = useState(false)
  const groups = [
    { title: 'Recettes', lines: entries.filter((entry) => entry.direction === 'in') },
    { title: 'Dépenses', lines: entries.filter((entry) => entry.direction === 'out') },
  ]

  return (
    <div className="ledger">
      {groups.map(
        ({ title, lines }) =>
          lines.length > 0 && (
            <div key={title} className="ledger__group">
              <div className="ledger__group-head">
                <span>{title}</span>
                <span>{formatEuros(lines.reduce((sum, line) => sum + line.amount, 0))}</span>
              </div>
              {lines.map((entry) => (
                <LedgerLine key={entry.id} entry={entry} actions={actions} onInvalid={setInvalid} />
              ))}
            </div>
          ),
      )}
      {invalid && (
        <p className="ledger__invalid" role="status">
          Ce montant n’est pas valide.
        </p>
      )}
      <AddLine actions={actions} onInvalid={setInvalid} />
    </div>
  )
}
