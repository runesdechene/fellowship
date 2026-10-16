/**
 * QUOI     — le champ de recherche des listes de l'administration (Comptes, Prospects).
 * POURQUOI — la recherche s'applique sur Entrée ou 300 ms après la dernière frappe ; le texte tapé
 *            reste local entre-temps pour ne pas recharger la liste à chaque lettre.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'

const TYPING_DELAY = 300

interface Props {
  /** La recherche en vigueur, lue dans l'adresse. */
  value: string
  placeholder: string
  onSearch: (q: string) => void
}

export function AdminSearch({ value, placeholder, onSearch }: Props) {
  const [text, setText] = useState(value)
  const [seen, setSeen] = useState(value)
  // Retour arrière du navigateur : l'adresse change, le champ la suit — sauf si c'est lui qui l'a écrite.
  if (value !== seen) {
    setSeen(value)
    if (value !== text.trim()) setText(value)
  }

  useEffect(() => {
    if (text.trim() === value) return
    const timer = setTimeout(() => onSearch(text.trim()), TYPING_DELAY)
    return () => clearTimeout(timer)
  }, [text, value, onSearch])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (text.trim() !== value) onSearch(text.trim())
  }

  return (
    <form className="admin-search" role="search" onSubmit={submit}>
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input
        type="search"
        className="admin-search__input"
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setText(event.target.value)}
      />
    </form>
  )
}
