/**
 * QUOI     — le champ « Adresse ou lieu » : pendant la frappe, cinq adresses réelles suggérées par
 *            la Base Adresse Nationale ; en choisir une remplit tout le lieu.
 * POURQUOI — lot 10b (Uriel, 11/10/2026) : une date créée doit avoir sa position sur la carte. Une
 *            adresse tapée sans choisir de suggestion reste une adresse libre.
 * ATTENTION — le focus reste dans le champ : c'est lui qui écoute le clavier et désigne la
 *            suggestion courante (`aria-activedescendant`), comme dans `Select`.
 */
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/Field'
import { searchPlaces, type PlaceSuggestion } from '@/lib/geocode'

/** En dessous de trois lettres, la BAN rend du bruit. */
const MIN_LENGTH = 3
/** On cherche quand la frappe se pose, pas à chaque lettre. */
const WAIT_MS = 300

interface AddressFieldProps {
  value: string
  onType: (address: string) => void
  onPick: (place: PlaceSuggestion) => void
}

export function AddressField({ value, onType, onPick }: AddressFieldProps) {
  const id = useId()
  // Ce qu'on a TAPÉ, seul à déclencher une recherche : choisir une suggestion change la valeur
  // du champ sans rouvrir la liste.
  const [query, setQuery] = useState('')
  // Les suggestions gardent la frappe qui les a demandées : une réponse arrivée après une frappe
  // plus récente ne s'affiche pas.
  const [found, setFound] = useState({ query: '', places: [] as PlaceSuggestion[] })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (query.trim().length < MIN_LENGTH) return
    let cancelled = false
    const timer = setTimeout(() => {
      void searchPlaces(query).then((places) => {
        if (!cancelled) setFound({ query, places })
      })
    }, WAIT_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const places =
    open && found.query === query && query.trim().length >= MIN_LENGTH ? found.places : []

  function pick(place: PlaceSuggestion) {
    onPick(place)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (places.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, places.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const place = places[active]
      if (place) pick(place)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <span className="address">
      <Input
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={places.length > 0}
        aria-controls={places.length > 0 ? `${id}-places` : undefined}
        aria-activedescendant={places.length > 0 ? `${id}-${String(active)}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onType(event.target.value)
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder="Place du Châtel, cour du château…"
      />
      {places.length > 0 && (
        <ul className="address__places" id={`${id}-places`} role="listbox">
          {places.map((place, index) => (
            <li
              key={`${String(index)}-${place.label}`}
              id={`${id}-${String(index)}`}
              className="address__place"
              role="option"
              aria-selected={index === active}
              // Le clic ne doit pas faire perdre le focus au champ avant d'être lu.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(place)}
            >
              {place.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
