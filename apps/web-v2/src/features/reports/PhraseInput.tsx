/**
 * QUOI     — le champ d'une phrase de passe, masquée, et l'œil qui l'affiche le temps de la relire.
 * POURQUOI — une phrase de 16 caractères tapée à l'aveugle se trompe facilement : on doit pouvoir la
 *            vérifier avant de l'envoyer (Uriel, 01/11/2026). Un seul champ pour toutes les phrases
 *            (déverrouiller, chiffrer, changer).
 */
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** `new-password` pour choisir une phrase, `current-password` pour la taper. */
  autoComplete: 'new-password' | 'current-password'
}

export function PhraseInput({ value, onChange, placeholder, autoComplete }: Props) {
  const [shown, setShown] = useState(false)
  const Icon = shown ? EyeOff : Eye
  return (
    <>
      <input
        className="ledger__field-input"
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
      <button
        type="button"
        className="phrase-input__reveal"
        aria-label={shown ? 'Masquer la phrase' : 'Afficher la phrase'}
        aria-pressed={shown}
        onClick={() => {
          setShown(!shown)
        }}
      >
        <Icon size={15} strokeWidth={2} />
      </button>
    </>
  )
}
