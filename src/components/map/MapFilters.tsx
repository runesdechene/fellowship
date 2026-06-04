import { Search, Star } from 'lucide-react'
import { useTags } from '@/hooks/use-tags'
import type { Period } from '@/lib/map-data'

interface MapFiltersProps {
  query: string
  onQuery: (v: string) => void
  tag: string | null
  onTag: (slug: string | null) => void
  period: Period
  onPeriod: (p: Period) => void
  mineOnly: boolean
  onMineOnly: (v: boolean) => void
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Toutes dates' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'month', label: 'Ce mois' },
]

export function MapFilters({ query, onQuery, tag, onTag, period, onPeriod, mineOnly, onMineOnly }: MapFiltersProps) {
  const { tags } = useTags()
  const chip = (active: boolean) =>
    `text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`
  const bar = 'pointer-events-auto flex gap-1.5 rounded-full bg-card/85 backdrop-blur border border-border p-1 shadow-lg overflow-x-auto max-w-full'

  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-2 pointer-events-none">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-card/85 backdrop-blur border border-border px-4 py-2 text-sm text-muted-foreground w-full max-w-sm shadow-lg">
          <Search size={15} />
          <input
            value={query}
            onChange={e => onQuery(e.target.value)}
            placeholder="Rechercher un festival, une ville…"
            className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() => onMineOnly(!mineOnly)}
          className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur ${mineOnly ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/85 text-muted-foreground border-border'}`}
        >
          <Star size={14} className={mineOnly ? '' : 'text-primary'} /> Mes festivals
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className={bar}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => onPeriod(p.value)} className={chip(period === p.value)}>{p.label}</button>
          ))}
        </div>
        <div className={bar}>
          <button onClick={() => onTag(null)} className={chip(tag === null)}>Tous</button>
          {tags.map(t => (
            <button key={t.value} onClick={() => onTag(t.value)} className={chip(tag === t.value)}>{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
