/**
 * QUOI     — un champ qui se remplit sur place et s'enregistre en le quittant (ou sur Entrée) ;
 *            Échap rend la valeur enregistrée.
 * POURQUOI — le dossier d'une date se tient comme un carnet : on tape, on passe, c'est noté. Pas
 *            de bouton « Enregistrer » pour un montant.
 * ATTENTION — le brouillon se recale quand la valeur enregistrée change sous lui (patron React
 *            d'un état dérivé d'une prop, ajusté pendant le rendu).
 */
import { useRef, useState } from 'react'

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
}

export function DraftInput({
  value,
  onSave,
  label,
  placeholder,
  type = 'text',
  inputMode,
  className,
  autoFocus,
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

  return (
    <input
      className={['draft-input', className].filter(Boolean).join(' ')}
      type={type}
      inputMode={inputMode}
      autoFocus={autoFocus}
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value)
      }}
      onBlur={() => {
        if (cancelled.current) {
          cancelled.current = false
          return
        }
        if (draft !== value) onSave(draft)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          cancelled.current = true
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
    />
  )
}
