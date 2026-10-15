/**
 * QUOI     — la barre de recherche de l'Explorer : Rechercher (un festival, une ville, un
 *            exposant) · Où · Quand, et le bouton rond.
 * POURQUOI — la recherche vit dans l'adresse (?q, ?ou, ?quand) : le retour du navigateur ramène
 *            la recherche d'avant, un lien se partage.
 * ATTENTION — un formulaire natif : Entrée lance la recherche, sans code maison.
 */
import { ChevronDown, Search, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { quandChoices, type Horizon } from '@/lib/explorer'

interface SearchBarProps {
  q: string
  ou: string
  quand: string | null
  onSearch: (next: { q: string; ou: string; quand: string }) => void
  /** Le choix le plus large suit l'horizon : 3 mois sans compte, 6 en gratuit (lib/explorer.ts). */
  horizon: Horizon
}

export function SearchBar({ q, ou, quand, onSearch, horizon }: SearchBarProps) {
  const choices = quandChoices(horizon, quand)
  const [words, setWords] = useState(q)
  const [place, setPlace] = useState(ou)
  const [when, setWhen] = useState(
    choices.some((option) => option.value === quand) ? (quand ?? '') : (choices[0]?.value ?? ''),
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    onSearch({ q: words.trim(), ou: place.trim(), quand: when })
  }

  return (
    <form className="search-bar" role="search" onSubmit={submit}>
      <label className="search-bar__field search-bar__field--words">
        <Search className="search-bar__icon" size={16} strokeWidth={2} />
        <span className="search-bar__body">
          <span className="search-bar__label">Rechercher</span>
          <input
            className="search-bar__input"
            value={words}
            placeholder="Un festival, une ville, un exposant…"
            onChange={(change) => {
              setWords(change.target.value)
            }}
          />
        </span>
        {words && (
          <button
            type="button"
            className="search-bar__clear"
            aria-label="Effacer la recherche"
            onClick={() => {
              setWords('')
              onSearch({ q: '', ou: place.trim(), quand: when })
            }}
          >
            <X size={12} strokeWidth={2.2} />
          </button>
        )}
      </label>
      <label className="search-bar__field">
        <span className="search-bar__body">
          <span className="search-bar__label">Où</span>
          <input
            className="search-bar__input"
            value={place}
            placeholder="Toute la France"
            onChange={(change) => {
              setPlace(change.target.value)
            }}
          />
        </span>
      </label>
      <label className="search-bar__field search-bar__field--when">
        <span className="search-bar__body">
          <span className="search-bar__label">Quand</span>
          <select
            className="search-bar__input search-bar__select"
            value={when}
            onChange={(change) => {
              setWhen(change.target.value)
            }}
          >
            {choices.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="search-bar__chevron" size={14} strokeWidth={2} aria-hidden />
        </span>
      </label>
      <button type="submit" className="search-bar__submit" aria-label="Lancer la recherche">
        <Search size={16} strokeWidth={2.2} />
      </button>
    </form>
  )
}
