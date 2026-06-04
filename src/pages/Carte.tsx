import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Users, Star } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useTags } from '@/hooks/use-tags'
import { useMapEvents } from '@/hooks/use-map-events'
import { useMapFriends } from '@/hooks/use-map-friends'
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
  const [period, setPeriod] = useState<Period>('all') // 'all' = à venir (composeFilter exclut les passés)
  const [query, setQuery] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [friendsMode, setFriendsMode] = useState(false)
  const now = useMemo(() => new Date(), [])

  const { friendsByEvent } = useMapFriends(friendsMode && isPro)

  const features = useMemo(() => {
    const filtered = composeFilter(
      events as unknown as EventWithScore[],
      { tags: selectedTags, zone, period, query, monthRange: null },
      { department: person?.department ?? null, now },
    )
    const fc = eventsToGeoJSON(filtered as unknown as EventForMap[], parts).features
    // « Mes festivals » et « Mes amis » s'additionnent (UNION) : les deux cochés = mes events
    // OU ceux de mes amis, pas l'intersection.
    const lenses: Array<(f: (typeof fc)[number]) => boolean> = []
    if (mineOnly) lenses.push(f => f.properties.accepted)
    if (friendsMode && isPro) lenses.push(f => (friendsByEvent[f.properties.id]?.length ?? 0) > 0)
    return lenses.length ? fc.filter(f => lenses.some(fn => fn(f))) : fc
  }, [events, parts, selectedTags, zone, period, query, mineOnly, friendsMode, isPro, friendsByEvent, person?.department, now])

  const toggleTag = (value: string) =>
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })

  const openEvent = (slug: string | null, id: string) => navigate(slug ? `/e/${slug}` : `/evenement/${id}`)

  const pill = (active: boolean) =>
    `pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/85 text-muted-foreground border-border'}`

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <MapCanvas
        features={features}
        theme={theme}
        avatarUrl={avatarUrl}
        avatarLabel={avatarLabel}
        friendsByEvent={friendsMode && isPro ? friendsByEvent : undefined}
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

      {/* Toggles Carte (hors menu Explorer). */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 items-start">
        <button onClick={() => setMineOnly(v => !v)} className={pill(mineOnly)}>
          <Star size={14} className={mineOnly ? '' : 'text-primary'} /> Mes festivals
        </button>
        <button
          onClick={() => { if (isPro) setFriendsMode(v => !v); else navigate('/abonnement') }}
          className={pill(friendsMode && isPro)}
          title={isPro ? 'Festivals où vont tes amis' : 'Réservé aux abonnés Pro'}
        >
          <Users size={14} className={friendsMode && isPro ? '' : 'text-primary'} /> Mes amis
          {!isPro && <Lock size={12} className="text-muted-foreground" />}
        </button>
      </div>

      {error && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-card/90 border border-border rounded-full px-4 py-2 text-sm text-muted-foreground">
          Carte momentanément indisponible.
        </div>
      )}
    </div>
  )
}
