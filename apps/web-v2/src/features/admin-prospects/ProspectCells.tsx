/**
 * QUOI     — les cellules modifiables du tableau des prospects : texte, contact, case.
 * POURQUOI — le prospectant travaille sans quitter le tableau (spec du lot 3) : un clic ouvre le
 *            texte, Entrée ou la sortie du champ enregistre, Échap annule.
 * ATTENTION — pendant l'écriture et le rechargement, la cellule montre déjà la nouvelle valeur ;
 *            un échec rend l'ancienne et affiche le message.
 */
import { useRef, useState } from 'react'
import { CHANNELS, contactLabel, validContactDate } from '@/lib/prospect'

type Save<T> = (next: T) => Promise<void>

/** La valeur montrée : celle en cours d'écriture, jusqu'à ce que la base en rende une nouvelle. */
function usePending<T>(value: T) {
  const [pending, setPending] = useState<{ value: T } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [base, setBase] = useState(value)
  if (!Object.is(base, value)) {
    setBase(value)
    setPending(null)
  }
  async function save(next: T, write: Save<T>) {
    if (Object.is(next, value)) return
    setProblem(null)
    setPending({ value: next })
    try {
      await write(next)
    } catch (error) {
      setPending(null)
      setProblem(error instanceof Error ? error.message : 'Enregistrement impossible')
    }
  }
  return { shown: pending ? pending.value : value, problem, save }
}

function Problem({ text }: { text: string | null }) {
  return text ? <span className="prospect-cell__problem">{text}</span> : null
}

export function TextCell({
  value,
  label,
  onSave,
  autoOpen = false,
  normalize = (text: string) => text.trim() || null,
  onClose,
}: {
  value: string | null
  label: string
  onSave: Save<string | null>
  autoOpen?: boolean
  /** La forme enregistrée de ce qui est tapé (l'e-mail se range en minuscules). */
  normalize?: (text: string) => string | null
  /** À la fermeture du champ : ce qui part en écriture, null si rien (vide ou Échap). */
  onClose?: (sent: string | null) => void
}) {
  const { shown, problem, save } = usePending(value)
  const [editing, setEditing] = useState(autoOpen)
  const [draft, setDraft] = useState(value ?? '')
  const cancelled = useRef(false)

  function open() {
    cancelled.current = false
    setDraft(shown ?? '')
    setEditing(true)
  }

  if (editing) {
    return (
      <input
        className="prospect-cell__input"
        aria-label={label}
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            cancelled.current = true
            event.currentTarget.blur()
          }
        }}
        onBlur={() => {
          setEditing(false)
          const next = cancelled.current ? null : normalize(draft)
          if (!cancelled.current) void save(next, onSave)
          onClose?.(next)
        }}
      />
    )
  }
  return (
    <span className="prospect-cell">
      <button
        type="button"
        className="prospect-cell__button"
        onClick={open}
        aria-label={shown ? `${label} : ${shown}` : label}
      >
        {shown ?? <span className="prospect-cell__empty">—</span>}
      </button>
      <Problem text={problem} />
    </span>
  )
}

export function CheckCell({
  checked,
  label,
  onSave,
  disabled = false,
  title,
}: {
  checked: boolean
  label: string
  onSave: Save<boolean>
  disabled?: boolean
  title?: string
}) {
  const { shown, problem, save } = usePending(checked)
  return (
    <span className="prospect-cell">
      <input
        type="checkbox"
        className="prospect-check"
        aria-label={label}
        title={title}
        checked={shown}
        disabled={disabled}
        onChange={(event) => void save(event.target.checked, onSave)}
      />
      <Problem text={problem} />
    </span>
  )
}

type ContactPatch = { contact_channel?: string | null; contacted_on?: string | null }

/**
 * Le canal et la date se modifient en brouillon : rien ne part tant que le focus n'a pas quitté
 * la cellule (ou sur Entrée) ; Échap annule. Le champ date rend « 0002-10-16 » en pleine frappe :
 * une date incomplète n'est jamais écrite.
 */
export function ContactCell({
  channel,
  on,
  onSave,
}: {
  channel: string | null
  on: string | null
  onSave: (patch: ContactPatch) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ channel: '', on: '' })
  const [problem, setProblem] = useState<string | null>(null)
  const cancelled = useRef(false)

  function start() {
    cancelled.current = false
    setDraft({ channel: channel ?? '', on: on ?? '' })
    setProblem(null)
    setOpen(true)
  }

  async function commit() {
    setOpen(false)
    if (cancelled.current) return
    const patch: ContactPatch = {}
    if ((draft.channel || null) !== channel) patch.contact_channel = draft.channel || null
    if ((draft.on || null) !== on) {
      if (draft.on && !validContactDate(draft.on)) {
        setProblem('Date incomplète : rien n’est enregistré.')
        return
      }
      patch.contacted_on = draft.on || null
    }
    if (Object.keys(patch).length === 0) return
    try {
      await onSave(patch)
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Enregistrement impossible')
    }
  }

  if (!open) {
    return (
      <span className="prospect-cell">
        <button
          type="button"
          className="prospect-cell__button"
          onClick={start}
          aria-label="Contact"
        >
          {contactLabel(channel, on) ?? <span className="prospect-cell__empty">—</span>}
        </button>
        <Problem text={problem} />
      </span>
    )
  }
  return (
    <span
      className="prospect-contact"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) void commit()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancelled.current = true
        if (event.key === 'Escape' || event.key === 'Enter') {
          event.preventDefault()
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        }
      }}
    >
      <select
        className="prospect-contact__channel"
        aria-label="Canal"
        autoFocus
        value={draft.channel}
        onChange={(event) => setDraft({ ...draft, channel: event.target.value })}
      >
        <option value="">—</option>
        {CHANNELS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        className="prospect-contact__date"
        aria-label="Date du contact"
        value={draft.on}
        onChange={(event) => setDraft({ ...draft, on: event.target.value })}
      />
    </span>
  )
}
