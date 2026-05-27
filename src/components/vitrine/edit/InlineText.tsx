import { useState } from 'react'
import { Check, X } from 'lucide-react'

interface InlineTextProps {
  value: string
  multiline?: boolean
  placeholder?: string
  /** Rendu en lecture quand on n'édite pas ce champ. */
  children: React.ReactNode
  onCommit: (value: string) => void
}

/** Affiche `children` ; au clic sur le crayon, ouvre un éditeur input/textarea avec ✓/✕. */
export function InlineText({ value, multiline, placeholder, children, onCommit }: InlineTextProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  function start() { setDraft(value); setOpen(true) }
  function commit() { onCommit(draft.trim()); setOpen(false) }
  function cancel() { setOpen(false) }

  if (!open) {
    return (
      <span className="v-edit-field">
        {children}
        <button type="button" className="v-edit-pencil" onClick={start} aria-label="Modifier">✏</button>
      </span>
    )
  }

  return (
    <span className="v-edit-inline">
      {multiline ? (
        <textarea
          className="v-edit-input" value={draft} placeholder={placeholder} autoFocus
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit(); if (e.key === 'Escape') cancel() }}
        />
      ) : (
        <input
          className="v-edit-input" value={draft} placeholder={placeholder} autoFocus
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
        />
      )}
      <button type="button" className="v-edit-ok" onClick={commit} aria-label="Valider"><Check /></button>
      <button type="button" className="v-edit-cancel" onClick={cancel} aria-label="Annuler"><X /></button>
    </span>
  )
}
