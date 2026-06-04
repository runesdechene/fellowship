import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { searchAddresses, departmentFromCitycode, type GeocodeResult } from '@/lib/geocode'

export type AddressSelection = {
  address: string
  lat: number
  lng: number
  city: string
  department: string
  postcode: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (selection: AddressSelection) => void
  inputClass?: string
}

export function AddressAutocomplete({ value, onChange, onSelect, inputClass = '' }: AddressAutocompleteProps) {
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)
  const skipNextSearch = useRef(false)

  useEffect(() => {
    // Ne pas relancer une recherche juste après une sélection (on vient d'écrire le label).
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }
    const timer = setTimeout(async () => {
      if (value.trim().length < 3) {
        setResults([])
        setOpen(false)
        return
      }
      const found = await searchAddresses(value)
      setResults(found)
      setOpen(found.length > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  const pick = (r: GeocodeResult) => {
    skipNextSearch.current = true
    setResults([])
    setOpen(false)
    onChange(r.label)
    onSelect({
      address: r.label,
      lat: r.lat,
      lng: r.lng,
      city: r.city,
      department: departmentFromCitycode(r.citycode),
      postcode: r.postcode,
    })
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          className={`${inputClass} pl-9`}
          placeholder="Rechercher une adresse ou un lieu…"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {results.map((r, i) => (
            <li key={`${r.citycode}-${i}`}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
