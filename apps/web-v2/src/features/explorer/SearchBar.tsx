/**
 * QUOI     — la barre de recherche de l'Explorer : Rechercher (un festival, une ville, un
 *            exposant) · Où, avec son rayon en menu dessous · Quand, et le bouton rond.
 * POURQUOI — la recherche vit dans l'adresse (?q, ?ou, ?rayon, ?quand) : le retour du navigateur ramène
 *            la recherche d'avant, un lien se partage.
 * ATTENTION — un formulaire natif : Entrée lance la recherche, sans code maison. Le panneau du
 *            rayon s'ouvre au focus de « Où » : une frise native (`input type=range`) de 0 à
 *            500 km. Il se referme sur un clic dehors, Échap, ou quand le focus quitte le champ.
 */
import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FocusEvent, type FormEvent } from 'react'
import { RAYON_MAX, RAYON_STEP, quandChoices, type Horizon } from '@/lib/explorer'

interface SearchBarProps {
  q: string
  ou: string
  /** En km ; 0 : le lieu seul. */
  rayon: number
  quand: string | null
  onSearch: (next: { q: string; ou: string; rayon: number; quand: string }) => void
  /** Le choix le plus large suit l'horizon : 3 mois sans compte, 6 en gratuit (lib/explorer.ts). */
  horizon: Horizon
}

export function SearchBar({ q, ou, rayon, quand, onSearch, horizon }: SearchBarProps) {
  const choices = quandChoices(horizon, quand)
  const [words, setWords] = useState(q)
  const [place, setPlace] = useState(ou)
  const [around, setAround] = useState(rayon)
  const [aroundOpen, setAroundOpen] = useState(false)
  const where = useRef<HTMLDivElement>(null)

  // Un clic hors du champ referme le panneau ; `mousedown`, comme le Select maison.
  useEffect(() => {
    if (!aroundOpen) return
    function outside(event: MouseEvent) {
      if (!where.current?.contains(event.target as Node)) setAroundOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => {
      document.removeEventListener('mousedown', outside)
    }
  }, [aroundOpen])

  /** Au clavier, Tab hors du champ referme ; un clic dans le panneau ne déplace pas le focus. */
  function leaveWhere(event: FocusEvent) {
    const next = event.relatedTarget
    if (next instanceof Node && !where.current?.contains(next)) setAroundOpen(false)
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
      <div
        ref={where}
        className="search-bar__field search-bar__field--where"
        onBlur={leaveWhere}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setAroundOpen(false)
        }}
      >
        <label className="search-bar__body">
          <span className="search-bar__label">
            Où{around > 0 && <span className="search-bar__around"> · {around} km</span>}
          </span>
          <input
            className="search-bar__input"
            value={place}
            placeholder="Toute la France"
            aria-expanded={aroundOpen}
            onFocus={() => {
              setAroundOpen(true)
            }}
            onChange={(change) => {
              setPlace(change.target.value)
            }}
          />
        </label>
        {(place || around > 0) && (
          <button
            type="button"
            className="search-bar__clear"
            aria-label="Effacer le lieu et le rayon"
            onClick={() => {
              setPlace('')
              setAround(0)
              setAroundOpen(false)
              onSearch({ q: words.trim(), ou: '', rayon: 0, quand: when })
            }}
          >
            <X size={12} strokeWidth={2.2} />
          </button>
        )}
        {aroundOpen && (
          <div className="search-bar__around-panel">
            <div className="search-bar__around-head">
              <span>Rayon autour du lieu</span>
              <strong>{around > 0 ? `${around} km` : 'Le lieu seul'}</strong>
            </div>
            <input
              type="range"
              className="search-bar__range"
              aria-label="Rayon autour du lieu, en km"
              min={0}
              max={RAYON_MAX}
              step={RAYON_STEP}
              value={around}
              onChange={(change) => {
                setAround(Number(change.target.value))
              }}
            />
            <span className="search-bar__range-ends" aria-hidden>
              <span>0</span>
              <span>{RAYON_MAX} km</span>
            </span>
          </div>
        )}
      </div>
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
