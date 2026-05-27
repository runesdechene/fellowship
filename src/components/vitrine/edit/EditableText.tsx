import { useState, useEffect } from 'react'

interface EditableTextProps {
  value: string
  onCommit: (value: string) => void
  multiline?: boolean
  placeholder?: string
  className?: string
  'aria-label'?: string
}

/**
 * Champ directement éditable en mode édition (pas de crayon) : l'input/textarea est
 * toujours affiché, et on persiste en quittant le champ (blur) — ou Entrée pour un input.
 * Pas de sauvegarde à chaque frappe.
 */
export function EditableText({ value, onCommit, multiline, placeholder, className, ...rest }: EditableTextProps) {
  const [draft, setDraft] = useState(value)
  // Resync si la valeur change en dehors (ex. autre champ committé) — pas pendant la frappe.
  useEffect(() => { setDraft(value) }, [value])

  const commit = () => { if (draft !== value) onCommit(draft) }
  const cls = `v-field ${className ?? ''}`

  return multiline ? (
    <textarea
      className={cls} value={draft} placeholder={placeholder}
      onChange={e => setDraft(e.target.value)} onBlur={commit} {...rest}
    />
  ) : (
    <input
      className={cls} value={draft} placeholder={placeholder}
      onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} {...rest}
    />
  )
}
