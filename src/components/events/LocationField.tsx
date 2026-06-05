import { useState, useEffect, lazy, Suspense } from 'react'
import { Map as MapIcon, X } from 'lucide-react'
import { AddressAutocomplete, type AddressSelection } from './AddressAutocomplete'

// Lazy : MapLibre (~1 Mo) ne doit pas entrer dans le chunk principal (EventForm est chargé
// eagerly par AppLayout). La carte n'est montée qu'au clic « Ajuster sur la carte ».
const PointPickerMap = lazy(() =>
  import('@/components/map/PointPickerMap').then(m => ({ default: m.PointPickerMap }))
)

const MapFallback = () => (
  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
    Chargement de la carte…
  </div>
)

export type LocationValue = {
  address: string
  city: string
  department: string
  postcode: string
  latitude: number | null
  longitude: number | null
  geo_precision: 'precise' | 'city' | null
}

interface LocationFieldProps {
  value: LocationValue
  onChange: (next: LocationValue) => void
  inputClass?: string
}

export function LocationField({ value, onChange, inputClass = '' }: LocationFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleAddressSelect = (sel: AddressSelection) => {
    onChange({
      ...value,
      address: sel.address,
      city: sel.city || value.city,
      department: sel.department || value.department,
      postcode: sel.postcode || value.postcode,
      latitude: sel.lat,
      longitude: sel.lng,
      geo_precision: 'precise',
    })
  }

  // Édition manuelle du texte après sélection -> on invalide les coords précises.
  const handleAddressChange = (address: string) => {
    onChange(value.geo_precision === 'precise'
      ? { ...value, address, latitude: null, longitude: null, geo_precision: null }
      : { ...value, address })
  }

  // Déplacement du pin -> coords précises ; on NE touche PAS aux champs texte (ville déjà bonne).
  const handlePinMove = (c: { lat: number; lng: number }) => {
    onChange({ ...value, latitude: c.lat, longitude: c.lng, geo_precision: 'precise' })
  }

  const center = value.latitude != null && value.longitude != null
    ? { lat: value.latitude, lng: value.longitude }
    : null

  return (
    <div>
      <AddressAutocomplete
        value={value.address}
        onChange={handleAddressChange}
        onSelect={handleAddressSelect}
        inputClass={inputClass}
      />
      <button
        type="button"
        onClick={() => setPickerOpen(o => !o)}
        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        <MapIcon className="h-4 w-4" />
        {pickerOpen ? 'Fermer la carte' : 'Ajuster sur la carte'}
      </button>

      {/* Desktop : carte inline dépliable */}
      {pickerOpen && isDesktop && (
        <div className="mt-2">
          <div className="flex h-64 flex-col">
            <Suspense fallback={<MapFallback />}>
              <PointPickerMap center={center} onMove={handlePinMove} />
            </Suspense>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Glisse la carte pour centrer le pin sur le lieu.</p>
        </div>
      )}

      {/* Mobile : feuille plein écran */}
      {pickerOpen && !isDesktop && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="font-semibold">Placer le lieu</span>
            <button type="button" onClick={() => setPickerOpen(false)} aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <Suspense fallback={<MapFallback />}>
            <PointPickerMap center={center} onMove={handlePinMove} />
          </Suspense>
          <div className="p-4">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Valider cette position
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
