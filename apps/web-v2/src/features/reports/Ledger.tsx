/**
 * QUOI     — les recettes et dépenses d'un bilan : deux groupes avec leur total, chaque ligne
 *            modifiable sur place, et la ligne d'ajout (catégorie, montant, « Ajouter »). Une
 *            date chiffrée montre Carte et Espèces (« chiffré »), masquées tant que la phrase
 *            n'est pas tapée (UnlockRow) ; la catégorie « Recettes chiffrées » ouvre EncryptDialog.
 *            Une date sans recette en clair d'une enseigne qui a sa phrase montre Carte et Espèces
 *            d'office (encryptsByDefault) : le premier montant saisi scelle la date. Commandes sûres
 *            (comptées) et potentielles (hors total) ont toujours leur ligne, chiffrée ou non selon la date.
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
  PackageCheck,
  PackageSearch,
  Plus,
  ShieldAlert,
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
import { formatEuros, parseAmount } from '@/lib/money'
import type { SecretRevenue } from '@/lib/cipher'
import {
  ORDER_CATEGORY,
  ORDER_LABELS,
  SECRET_CATEGORY,
  addableCategories,
  categoryLabel,
  revenueRegime,
  type OrderKind,
} from '@/lib/report-writes'
import { ordersNotes } from '@/lib/reports'
import { useRevenueKey } from '@/lib/revenue-key'
import type { LedgerCategory } from '@/types/database'
import peageIcon from '@/assets/peage.svg'
import { EncryptDialog } from './EncryptDialog'
import { UnlockDialog } from './UnlockDialog'
import { UnlockRow } from './UnlockRow'
import type { ReportActions, ReportDetail, ReportEntry } from './useReport'
import { MaskedAmount } from '@/components/ui/MaskedAmount'

type Choice = LedgerCategory | typeof SECRET_CATEGORY.value

const ICONS: Partial<Record<LedgerCategory, LucideIcon>> = {
  ventes: ShoppingBag,
  remboursement: Undo2,
  cachet: HandCoins,
  emplacement: Tent,
  essence: Fuel,
  hebergement: BedDouble,
  repas: Utensils,
  vol: ShieldAlert,
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
  /** Le nom se modifie sur place (ligne « Autre ») ; vidé, `onSave` reçoit null. */
  rename?: { value: string; onSave: (label: string | null) => void }
  direction: 'in' | 'out'
  /** 'masked' : chiffré et verrouillé, montré une mosaïque pixelisée (MaskedAmount) sans champ. */
  amount: number | 'masked'
  /** Le montant saisi ; null quand le champ est vidé. */
  onSave: (amount: number | null) => void
  onRemove?: () => void
  onInvalid: (invalid: boolean) => void
}

function LedgerLine(props: LedgerLineProps) {
  const { icon, label, badge, rename, direction, amount, onSave, onRemove, onInvalid } = props
  return (
    <div className="ledger__line">
      {icon}
      <span className="ledger__label">
        {rename ? (
          <DraftInput
            className="ledger__rename"
            label="Nom de la ligne"
            placeholder="Autre"
            value={rename.value}
            onSave={(draft) => {
              rename.onSave(draft.trim() || null)
            }}
          />
        ) : (
          label
        )}
        {badge && <span className="ledger__badge">{badge}</span>}
      </span>
      {amount === 'masked' ? (
        <span className="ledger__amount">
          <MaskedAmount />
        </span>
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
  const isOther = entry.category === 'autre'
  return (
    <LedgerLine
      icon={<LineIcon Icon={ICONS[entry.category]} />}
      label={(isOther && entry.label) || categoryLabel(entry.category)}
      rename={
        isOther
          ? {
              value: entry.label ?? '',
              onSave: (label) => {
                actions.setLabel(entry, label)
              },
            }
          : undefined
      }
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
  const { date, entries, revenue, orders } = detail
  const revenueKey = useRevenueKey()
  const [invalid, setInvalid] = useState(false)
  const [asking, setAsking] = useState<'unlock' | 'dialog' | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  // Pas encore scellée : Carte et Espèces valent 0 tant que la clé est ouverte, masquées sinon.
  const { byDefault, masked, encrypted } = revenueRegime(
    date.secret,
    entries,
    revenueKey.status,
    orders.potentielles,
  )
  const clearIn = entries.filter((entry) => entry.direction === 'in')
  // Les commandes sûres ont leur ligne fixe : elles comptent dans le total, pas dans cette liste.
  const otherIn = clearIn.filter((entry) => entry.category !== ORDER_CATEGORY)
  const manualIn = otherIn.filter((entry) => entry.source === 'manual')
  const outLines = entries.filter((entry) => entry.direction === 'out')
  const secretTotal = revenue ? revenue.carte + revenue.especes + revenue.sures : 0
  const revenueTotal = masked ? <MaskedAmount /> : formatEuros(sum(clearIn) + secretTotal)
  const notes = masked ? [] : ordersNotes(orders)

  /** Un montant chiffré modifié sur place : tous se rescellent ensemble. */
  function reseal(part: keyof SecretRevenue, amount: number | null) {
    const key = revenueKey.key
    if (!key) return
    // Rien de scellé pour un zéro : la date resterait « remplie » sans que rien n'y soit saisi.
    if (byDefault && !amount) return
    actions.resealPart(key, part, amount ?? 0)
  }

  const orderLine = (kind: OrderKind) => (
    <LedgerLine
      key={kind}
      icon={<LineIcon Icon={kind === 'sures' ? PackageCheck : PackageSearch} />}
      label={ORDER_LABELS[kind]}
      badge={kind === 'potentielles' ? 'hors total' : encrypted ? 'chiffré' : undefined}
      direction="in"
      amount={masked ? 'masked' : orders[kind]}
      onSave={(amount) => {
        if (encrypted) reseal(kind, amount)
        else actions.setClearOrder(kind, amount ?? 0)
      }}
      onInvalid={setInvalid}
    />
  )

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
      <div className="ledger__group">
        <div className="ledger__group-head">
          <span>Recettes</span>
          <span>{revenueTotal}</span>
        </div>
        {notes.map((note) => (
          <p key={note} className="ledger__note">
            {note}
          </p>
        ))}
        {encrypted && [secretLine('carte'), secretLine('especes')]}
        {orderLine('sures')}
        {orderLine('potentielles')}
        {masked && (
          <UnlockRow
            onAsk={() => {
              setUnlocking(true)
            }}
          />
        )}
        {otherIn.map((entry) => (
          <EntryLine key={entry.id} entry={entry} actions={actions} onInvalid={setInvalid} />
        ))}
      </div>
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
      {unlocking && (
        <UnlockDialog
          onDone={() => {
            setUnlocking(false)
          }}
        />
      )}
      {asking === 'unlock' && !encrypted && (
        <UnlockDialog
          onDone={(opened) => {
            setAsking(opened ? 'dialog' : null)
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
            onSeal: (key, takings) => {
              actions.sealRevenue(key, { ...takings, ...orders })
            },
          }}
          onClose={() => {
            setAsking(null)
          }}
        />
      )}
    </div>
  )
}
