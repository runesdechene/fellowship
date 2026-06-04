import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/use-theme'
import { useMapEvents } from '@/hooks/use-map-events'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapFilters } from '@/components/map/MapFilters'
import { EventPanel } from '@/components/map/EventPanel'
import { eventsInBounds, filterFeatures, type Bounds } from '@/lib/map-data'

export default function Carte() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { data, avatarUrl, avatarLabel, error } = useMapEvents()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [bounds, setBounds] = useState<Bounds | null>(null)

  const visible = useMemo(() => filterFeatures(data.features, { query, tag }), [data.features, query, tag])
  const inView = useMemo(() => (bounds ? eventsInBounds(visible, bounds) : visible), [visible, bounds])

  const openEvent = (slug: string | null, id: string) => navigate(slug ? `/e/${slug}` : `/evenement/${id}`)

  return (
    <div className="relative w-full h-full">
      <MapCanvas
        features={visible}
        theme={theme}
        avatarUrl={avatarUrl}
        avatarLabel={avatarLabel}
        onBoundsChange={setBounds}
        onSelect={openEvent}
      />
      <MapFilters query={query} onQuery={setQuery} tag={tag} onTag={setTag} />
      <EventPanel features={inView} onSelect={openEvent} />
      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-card/90 border border-border rounded-full px-4 py-2 text-sm text-muted-foreground">
          Carte momentanément indisponible.
        </div>
      )}
    </div>
  )
}
