/**
 * QUOI     — les recettes et dépenses d'un bilan : deux groupes avec leur total, chaque ligne
 *            modifiable sur place, et la ligne d'ajout (catégorie, montant, « Ajouter »). Une
 *            date chiffrée montre Carte et Espèces (« chiffré »), masquées tant que la phrase
 *            n'est pas tapée (UnlockRow) ; la catégorie « Recettes chiffrées » ouvre EncryptDialog.
 *            Une date sans recette en clair d'une enseigne qui a sa phrase montre Carte et Espèces
 *            d'office (encryptsByDefault) : le premier montant saisi scelle la date.
 * POURQUOI — chaque ligne s'enregistre aussitôt, comme le dossier d'une date : on tape, on passe.
 * ATTENTION — la ligne « depuis la fiche » est le prix de la place de Mon dossier : useReport
 *            l'écrit par set_stand_amount. Vider un montant retire la ligne ; un montant qui ne
 *            veut rien dire ne touche à rien et le dit. Carte et Espèces se rescellent ensemble à
 *            chaque changement, 0 compris : elles restent masquées même à zéro.
 */
import {
  Banknote,
  BedDouble,
  Circle,
  CreditCard,
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
import { useState, type CSSProperties, type ReactNode } from 'react'
import { DraftInput } from '@/components/ui/DraftInput'
import { Select } from '@/components/ui/Select'
import { formatDateRange } from '@/lib/dates'
import { formatEuros, MASKED_EUROS, parseAmount } from '@/lib/money'
import {
  SECRET_CATEGORY,
  addableCategories,
  categoryLabel,
  encryptsByDefault,
} from '@/lib/report-writes'
import { useRevenueKey } from '@/lib/revenue-key'
import type { LedgerCategory } from '@/types/database'
import peageIcon from '@/assets/peage.svg'
import { EncryptDialog } from './EncryptDialog'
import { UnlockRow } from './UnlockRow'
import type { ReportActions, ReportDetail, ReportEntry } from './useReport'

type Choice = LedgerCategory | typeof SECRET_CATEGORY.value

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

function LineIcon({ Icon }: { Icon: LucideIcon | undefined }) {
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

interface LedgerLineProps {
  icon: ReactNode
  label: string
  badge?: string
  direction: 'in' | 'out'
  /** 'masked' : chiffré et verrouillé, montré « •••• € » sans champ. */
  amount: number | 'masked'
  /** Le montant saisi ; null quand le champ est vidé. */
  onSave: (amount: number | null) => void
  onRemove?: () => void
  onInvalid: (invalid: boolean) => void
}

function LedgerLine(props: LedgerLineProps) {
  const { icon, label, badge, direction, amount, onSave, onRemove, onInvalid } = props
  return (
    <div className="ledger__line">
      {icon}
      <span className="ledger__label">
        {label}
        {badge && <span className="ledger__badge">{badge}</span>}
      </span>
      {amount === 'masked' ? (
        <span className="ledger__amount report-secret__masked">{MASKED_EUROS}</span>
      ) : (
        <span className="ledger__amount">
          <span aria-hidden="true">{direction === 'in' ? '+' : '−'}</span>
          <DraftInput
            className="ledger__input"
            label={`Montant — ${label}`}
            inputMode="decimal"
            value={formatEuros(amount)}
            onSave={(draft) => {
              const parsed = parseAmount(draft)
              onInvalid(parsed === 'invalide')
              if (parsed !== 'invalide') onSave(parsed)
            }}
          />
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          className="ledger__remove"
          aria-label={`Retirer la ligne ${label}`}
          onClick={onRemove}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

function EntryLine({
  entry,
  actions,
  onInvalid,
}: {
  entry: ReportEntry
  actions: ReportActions
  onInvalid: (invalid: boolean) => void
}) {
  return (
    <LedgerLine
      icon={<LineIcon Icon={ICONS[entry.category]} />}
      label={categoryLabel(entry.category)}
      badge={entry.source === 'stepper' ? 'depuis la fiche' : undefined}
      direction={entry.direction}
      amount={entry.amount}
      onSave={(amount) => {
        if (amount === null || amount === 0) actions.removeLine(entry)
        else actions.setAmount(entry, amount)
      }}
      onRemove={() => {
        actions.removeLine(entry)
      }}
      onInvalid={onInvalid}
    />
  )
}

function AddLine({
  actions,
  offerSecret,
  encrypted,
  onSecret,
  onInvalid,
}: {
  actions: ReportActions
  /** La date n'est pas encore chiffrée : la catégorie « Recettes chiffrées » est proposée. */
  offerSecret: boolean
  /** Date chiffrée : seules les dépenses s'ajoutent ici, une recette en clair contournerait le secret. */
  encrypted: boolean
  onSecret: () => void
  onInvalid: (invalid: boolean) => void
}) {
  const [chosen, setChosen] = useState<Choice>('autre')
  const [draft, setDraft] = useState('')
  const amount = parseAmount(draft)
  const ready = typeof amount === 'number' && amount > 0
  const options = [...(offerSecret ? [SECRET_CATEGORY] : []), ...addableCategories(encrypted)].map<{
    value: Choice
    label: string
  }>((entry) => ({ value: entry.value, label: entry.label }))
  // Une catégorie qui n'est plus proposée (la date vient d'être chiffrée) retombe sur « Autre ».
  const category = options.some((option) => option.value === chosen) ? chosen : 'autre'

  return (
    <form
      className="ledger__add"
      onSubmit={(event) => {
        event.preventDefault()
        if (category === SECRET_CATEGORY.value) {
          onSecret()
          return
        }
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
        options={options}
        onChange={(choice) => {
          setChosen(choice)
          if (choice === SECRET_CATEGORY.value) onSecret()
        }}
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
      <button
        type="submit"
        className="ledger__submit"
        disabled={category !== SECRET_CATEGORY.value && draft.trim() === ''}
      >
        <Plus size={14} strokeWidth={2} />
        Ajouter
      </button>
    </form>
  )
}

const sum = (lines: ReportEntry[]) => lines.reduce((total, line) => total + line.amount, 0)

export function Ledger({ detail, actions }: { detail: ReportDetail; actions: ReportActions }) {
  const { date, entries, revenue } = detail
  const revenueKey = useRevenueKey()
  const [invalid, setInvalid] = useState(false)
  const [asking, setAsking] = useState<'unlock' | 'dialog' | null>(null)
  // Pas encore scellée : Carte et Espèces valent 0 tant que la clé est ouverte, masquées sinon.
  const byDefault = encryptsByDefault(date.secret, entries, revenueKey.status)
  const masked = date.secret === 'masked' || (byDefault && revenueKey.status === 'locked')
  const encrypted = date.secret !== 'none' || byDefault
  const clearIn = entries.filter((entry) => entry.direction === 'in')
  const manualIn = clearIn.filter((entry) => entry.source === 'manual')
  const outLines = entries.filter((entry) => entry.direction === 'out')
  const secretTotal = revenue ? revenue.carte + revenue.especes : 0
  const revenueTotal = masked ? MASKED_EUROS : formatEuros(sum(clearIn) + secretTotal)

  /** Carte ou Espèces modifiée sur place : les deux se rescellent ensemble. */
  function reseal(part: 'carte' | 'especes', amount: number | null) {
    const key = revenueKey.key
    if (!key) return
    // Rien de scellé pour un zéro : la date resterait « remplie » sans que rien n'y soit saisi.
    if (byDefault) {
      if (!amount) return
      actions.sealRevenue(
        key,
        part === 'carte' ? { carte: amount, especes: 0 } : { carte: 0, especes: amount },
      )
      return
    }
    actions.resealPart(key, part, amount ?? 0)
  }

  const secretLine = (part: 'carte' | 'especes') => (
    <LedgerLine
      key={part}
      icon={<LineIcon Icon={part === 'carte' ? CreditCard : Banknote} />}
      label={part === 'carte' ? 'Carte' : 'Espèces'}
      badge="chiffré"
      direction="in"
      amount={revenue ? revenue[part] : masked ? 'masked' : 0}
      onSave={(amount) => {
        reseal(part, amount)
      }}
      onInvalid={setInvalid}
    />
  )

  return (
    <div className="ledger">
      {(encrypted || clearIn.length > 0) && (
        <div className="ledger__group">
          <div className="ledger__group-head">
            <span>Recettes</span>
            <span>{revenueTotal}</span>
          </div>
          {encrypted && [secretLine('carte'), secretLine('especes')]}
          {masked && <UnlockRow />}
          {clearIn.map((entry) => (
            <EntryLine key={entry.id} entry={entry} actions={actions} onInvalid={setInvalid} />
          ))}
        </div>
      )}
      {outLines.length > 0 && (
        <div className="ledger__group">
          <div className="ledger__group-head">
            <span>Dépenses</span>
            <span>{formatEuros(sum(outLines))}</span>
          </div>
          {outLines.map((entry) => (
            <EntryLine key={entry.id} entry={entry} actions={actions} onInvalid={setInvalid} />
          ))}
        </div>
      )}
      {invalid && (
        <p className="ledger__invalid" role="status">
          Ce montant n’est pas valide.
        </p>
      )}
      <AddLine
        actions={actions}
        offerSecret={revenueKey.ready && !encrypted}
        encrypted={encrypted}
        onSecret={() => {
          setAsking(revenueKey.status === 'locked' ? 'unlock' : 'dialog')
        }}
        onInvalid={setInvalid}
      />
      {asking === 'unlock' && revenueKey.status === 'locked' && !encrypted && (
        <UnlockRow
          onOpen={() => {
            setAsking('dialog')
          }}
        />
      )}
      {asking === 'dialog' && !encrypted && (
        <EncryptDialog
          subtitle={`${date.name}, ${formatDateRange(date.startDate, date.endDate, 'long')} ${date.startDate.getFullYear()}`}
          seal={{
            // La maquette ne répartit pas les recettes saisies : tout part sur Carte, Espèces à 0.
            initial: { carte: sum(manualIn), especes: 0 },
            replaces: manualIn.length > 0,
            onSeal: actions.sealRevenue,
          }}
          onClose={() => {
            setAsking(null)
          }}
        />
      )}
    </div>
  )
}
