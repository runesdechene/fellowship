/**
 * QUOI     — la recherche de la landing et de la page publique : Rechercher · Où · Quand.
 * POURQUOI — lot 11b : elle mène à de vrais résultats (/festivals), sans compte, sur 3 mois (règle
 *            du 14/10/2026), au lieu de la connexion.
 * ATTENTION — un formulaire natif : Entrée lance la recherche. L'état vit dans l'adresse.
 */
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { GUEST_MONTHS, quandChoices } from '@/lib/explorer'

interface LandingSearchProps {
  q?: string
  ou?: string
  quand?: string | null
}

export function LandingSearch({ q = '', ou = '', quand = null }: LandingSearchProps) {
  const navigate = useNavigate()
  const choices = quandChoices(GUEST_MONTHS, quand)
  const [words, setWords] = useState(q)
  const [place, setPlace] = useState(ou)
  const [when, setWhen] = useState(
    choices.some((option) => option.value === quand) ? (quand ?? '') : (choices[0]?.value ?? ''),
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (words.trim()) next.set('q', words.trim())
    if (place.trim()) next.set('ou', place.trim())
    if (when !== String(GUEST_MONTHS)) next.set('quand', when)
    const search = next.toString()
    void navigate(`/festivals${search ? `?${search}` : ''}`)
  }

  return (
    <form className="landing-search" role="search" onSubmit={submit}>
      <label className="landing-search__field landing-search__field--what">
        <span className="landing-search__label">Rechercher</span>
        <input
          className="landing-search__value"
          value={words}
          placeholder="Un festival, une ville…"
          onChange={(change) => {
            setWords(change.target.value)
          }}
        />
      </label>
      <label className="landing-search__field landing-search__field--where">
        <span className="landing-search__label">Où</span>
        <input
          className="landing-search__value"
          value={place}
          placeholder="Toute la France"
          onChange={(change) => {
            setPlace(change.target.value)
          }}
        />
      </label>
      <label className="landing-search__field landing-search__field--when">
        <span className="landing-search__label">Quand</span>
        <select
          className="landing-search__value"
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
      </label>
      <button type="submit" className="landing-search__submit" aria-label="Rechercher">
        <Search size={18} strokeWidth={2.2} />
      </button>
    </form>
  )
}
