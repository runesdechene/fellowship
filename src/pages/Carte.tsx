import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Users, Star } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useTags } from '@/hooks/use-tags'
import { useMapEvents } from '@/hooks/use-map-events'
import { MapCanvas } from '@/components/map/MapCanvas'
import { SearchSegments } from '@/components/explorer/SearchSegments'
import { composeFilter, type Zone, type Period } from '@/lib/explorer'
import { eventsToGeoJSON, type EventForMap } from '@/lib/map-data'
import type { EventWithScore } from '@/types/database'

export default function Carte() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { person, currentActor, currentActorRow } = useAuth()
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'
  const { tags } = useTags()
  const { events, parts, avatarUrl, avatarLabel, error } = useMapEvents()

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [zone, setZone] = useState<Zone>('france')
  const [period, setPeriod] = useState<Period>('all') // 'all' = à venir (les passés sont exclus par composeFilter)
  const [query, setQuery] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const now = useMemo(() => new Date(), [])

  const features = useMemo(() => {
    const filtered = composeFilter(
      events as unknown as EventWithScore[],
      { tags: selectedTags, zone, period, query, monthRange: null },
      { department: person?.department ?? null, now },
    )
    const fc = eventsToGeoJSON(filtered as unknown as EventForMap[], parts)
    return mineOnly ? fc.features.filter(f => f.properties.accepted) : fc.features
  }, [events, parts, selectedTags, zone, period, query, mineOnly, person?.department, now])

  const toggleTag = (value: string) =>
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })

  const openEvent = (slug: string | null, id: string) => navigate(slug ? `/e/${slug}` : `/evenement/${id}`)

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <MapCanvas
        features={features}
        theme={theme}
        avatarUrl={avatarUrl}
        avatarLabel={avatarLabel}
        onSelect={openEvent}
      />

      {/* Menu Quoi / Où / Quand — exactement celui de l'Explorer (CSS scopé .explorer, global). */}
      <div className="carte-filterbar explorer">
        <SearchSegments
          tags={tags}
          selectedTags={selectedTags}
          zone={zone}
          period={period}
          query={query}
          userDept={person?.department ?? null}
          onToggleTag={toggleTag}
          onZone={setZone}
          onPeriod={setPeriod}
          onQuery={setQuery}
        />
      </div>

      {/* Mes festivals (acceptés) — toggle Carte, hors menu Explorer. */}
      <button
        onClick={() => setMineOnly(v => !v)}
        className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur ${mineOnly ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/85 text-muted-foreground border-border'}`}
      >
        <Star size={14} className={mineOnly ? '' : 'text-primary'} /> Mes festivals
      </button>

      <button
        onClick={() => { if (!isPro) navigate('/abonnement') }}
        className="absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full bg-card/85 backdrop-blur border border-border px-4 py-2 text-sm font-semibold text-foreground shadow-lg"
        title={isPro ? 'Voir qui de ton réseau y va' : 'Réservé aux abonnés Pro'}
      >
        <Users size={15} className="text-primary" />
        Qui de mon réseau y va
        {!isPro && <Lock size={13} className="text-muted-foreground" />}
      </button>

      {error && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-card/90 border border-border rounded-full px-4 py-2 text-sm text-muted-foreground">
          Carte momentanément indisponible.
        </div>
      )}
    </div>
  )
}
