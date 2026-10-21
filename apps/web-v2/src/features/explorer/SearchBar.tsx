/**
 * QUOI     — la barre de recherche de l'Explorer : Rechercher (un festival, une ville, un
 *            exposant) · Où, avec son rayon en menu dessous · Quand, et le bouton rond.
 * POURQUOI — la recherche vit dans l'adresse (?q, ?ou, ?rayon, ?quand) : le retour du navigateur ramène
 *            la recherche d'avant, un lien se partage.
 * ATTENTION — un formulaire natif : Entrée lance la recherche, sans code maison. Le menu du
 *            rayon s'ouvre au focus de « Où » et garde le focus dans le champ : les flèches
 *            changent le rayon, Échap le ferme. Il reprend le dessin du Select maison.
 */
import { ChevronDown, Search, X } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { RAYON_OPTIONS, quandChoices, type Horizon } from '@/lib/explorer'

interface SearchBarProps {
  q: string
  ou: string
  rayon: string
  quand: string | null
  onSearch: (next: { q: string; ou: string; rayon: string; quand: string }) => void
  /** Le choix le plus large suit l'horizon : 3 mois sans compte, 6 en gratuit (lib/explorer.ts). */
  horizon: Horizon
}

export function SearchBar({ q, ou, rayon, quand, onSearch, horizon }: SearchBarProps) {
  const choices = quandChoices(horizon, quand)
  const [words, setWords] = useState(q)
  const [place, setPlace] = useState(ou)
  const [around, setAround] = useState(rayon)
  const [aroundOpen, setAroundOpen] = useState(false)
  const aroundIndex = Math.max(
    0,
    RAYON_OPTIONS.findIndex((option) => option.value === around),
  )

  /** Les flèches font défiler le rayon sans quitter le champ ; Échap referme le menu. */
  function aroundKeys(event: KeyboardEvent<HTMLInputElement>) {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step) {
      event.preventDefault()
      const next = Math.min(Math.max(aroundIndex + step, 0), RAYON_OPTIONS.length - 1)
      setAround(RAYON_OPTIONS[next]?.value ?? '')
      setAroundOpen(true)
    }
    if (event.key === 'Escape') setAroundOpen(false)
  }
  const [when, setWhen] = useState(
    choices.some((option) => option.value === quand) ? (quand ?? '') : (choices[0]?.value ?? ''),
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    onSearch({ q: words.trim(), ou: place.trim(), rayon: around, quand: when })
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
              onSearch({ q: '', ou: place.trim(), rayon: around, quand: when })
            }}
          >
            <X size={12} strokeWidth={2.2} />
          </button>
        )}
      </label>
      <label className="search-bar__field search-bar__field--where">
        <span className="search-bar__body">
          <span className="search-bar__label">
            Où{around && <span className="search-bar__around"> · {around} km</span>}
          </span>
          <input
            className="search-bar__input"
            value={place}
            placeholder="Toute la France"
            aria-haspopup="listbox"
            aria-expanded={aroundOpen}
            onFocus={() => {
              setAroundOpen(true)
            }}
            onBlur={() => {
              setAroundOpen(false)
            }}
            onKeyDown={aroundKeys}
            onChange={(change) => {
              setPlace(change.target.value)
            }}
          />
        </span>
        {aroundOpen && (
          <ul
            className="select__menu search-bar__menu"
            role="listbox"
            aria-label="Rayon autour du lieu"
          >
            {RAYON_OPTIONS.map((option, position) => (
              <li key={option.value}>
                <button
                  type="button"
                  className="select__option"
                  role="option"
                  aria-selected={position === aroundIndex}
                  tabIndex={-1}
                  // `mousedown` : choisir avant que le champ perde le focus et referme le menu.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    setAround(option.value)
                    setAroundOpen(false)
                  }}
                >
                  <span className="select__mot">{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
