import { useState } from 'react'
import { X } from 'lucide-react'
import { addChip, SPECIALTIES_CAP } from '@/lib/vitrine-edit'

interface ChipEditorProps {
  values: string[]
  onChange: (next: string[]) => void
}

/** Tags éditables : taper + Entrée ajoute, ✕ retire. Cap géré par addChip. */
export function ChipEditor({ values, onChange }: ChipEditorProps) {
  const [input, setInput] = useState('')
  const full = values.length >= SPECIALTIES_CAP

  function add() {
    const next = addChip(values, input)
    if (next !== values) onChange(next)
    setInput('')
  }

  return (
    <div className="v-chips v-chips-edit">
      {values.map(v => (
        <span key={v} className="v-chip">
          {v}
          <button type="button" className="v-chip-x" onClick={() => onChange(values.filter(c => c !== v))} aria-label={`Retirer ${v}`}><X /></button>
        </span>
      ))}
      {!full && (
        <input
          className="v-chip-input" value={input} placeholder="+ spécialité"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          onBlur={add}
        />
      )}
    </div>
  )
}
