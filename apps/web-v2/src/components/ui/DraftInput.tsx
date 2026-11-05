/**
 * QUOI     — un champ qui se remplit sur place et s'enregistre en le quittant (ou sur Entrée) ;
 *            Échap rend la valeur enregistrée.
 * POURQUOI — le dossier d'une date se tient comme un carnet : on tape, on passe, c'est noté. Pas
 *            de bouton « Enregistrer » pour un montant.
 *            En plusieurs lignes (`multiline`), Entrée va à la ligne : on enregistre en quittant.
 * ATTENTION — le brouillon se recale quand la valeur enregistrée change sous lui (patron React
 *            d'un état dérivé d'une prop, ajusté pendant le rendu).
 */
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'

interface DraftInputProps {
  value: string
  onSave: (draft: string) => void
  label: string
  placeholder?: string
  type?: 'text' | 'date'
  inputMode?: 'decimal' | 'text'
  className?: string
  /** Le champ vient d'être ouvert à la demande : il prend la main tout de suite. */
  autoFocus?: boolean
  /** Une note, une raison : une zone de texte au lieu d'une ligne. */
  multiline?: boolean
}

type Field = HTMLInputElement | HTMLTextAreaElement

export function DraftInput({
  value,
  onSave,
  label,
  placeholder,
  type = 'text',
  inputMode,
  className,
  autoFocus,
  multiline,
}: DraftInputProps) {
  const [draft, setDraft] = useState(value)
  // Échap rend la valeur puis quitte le champ : sans ce drapeau, la sortie enregistrerait le
  // brouillon qu'on vient d'abandonner.
  const cancelled = useRef(false)
  const [known, setKnown] = useState(value)
  if (known !== value) {
    setKnown(value)
    setDraft(value)
  }

  const shared = {
    className: ['draft-input', className].filter(Boolean).join(' '),
    autoFocus,
    'aria-label': label,
    placeholder,
    value: draft,
    onChange: (event: ChangeEvent<Field>) => {
      setDraft(event.target.value)
    },
    onBlur: () => {
      if (cancelled.current) {
        cancelled.current = false
        return
      }
      if (draft !== value) onSave(draft)
    },
    onKeyDown: (event: KeyboardEvent<Field>) => {
      if (event.key === 'Enter' && !multiline) event.currentTarget.blur()
      if (event.key === 'Escape') {
        cancelled.current = true
        setDraft(value)
        event.currentTarget.blur()
      }
    },
  }

  if (multiline) return <textarea {...shared} rows={3} />
  return <input {...shared} type={type} inputMode={inputMode} />
}
