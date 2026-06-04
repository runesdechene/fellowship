import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Users } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useMapEvents } from '@/hooks/use-map-events'
import { MapCanvas } from '@/components/map/MapCanvas'
import { MapFilters } from '@/components/map/MapFilters'
import { filterFeatures, filterByPeriod, type Period } from '@/lib/map-data'

export default function Carte() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { currentActor, currentActorRow } = useAuth()
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'
  const { data, avatarUrl, avatarLabel, error } = useMapEvents()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('all')
  const [mineOnly, setMineOnly] = useState(false)
  const now = useMemo(() => new Date(), [])

  const visible = useMemo(
    () => filterByPeriod(filterFeatures(data.features, { tag, query, mineOnly }), period, now),
    [data.features, tag, query, mineOnly, period, now],
  )

  const openEvent = (slug: string | null, id: string) => navigate(slug ? `/e/${slug}` : `/evenement/${id}`)

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <MapCanvas
        features={visible}
        theme={theme}
        avatarUrl={avatarUrl}
        avatarLabel={avatarLabel}
        onSelect={openEvent}
      />
      <MapFilters
        query={query}
        onQuery={setQuery}
        tag={tag}
        onTag={setTag}
        period={period}
        onPeriod={setPeriod}
        mineOnly={mineOnly}
        onMineOnly={setMineOnly}
      />
      <button
        onClick={() => { if (!isPro) navigate('/abonnement') }}
        className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full bg-card/85 backdrop-blur border border-border px-4 py-2 text-sm font-semibold text-foreground shadow-lg"
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
