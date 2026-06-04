import { Search } from 'lucide-react'
import { useTags } from '@/hooks/use-tags'

interface MapFiltersProps {
  query: string
  onQuery: (v: string) => void
  tag: string | null
  onTag: (slug: string | null) => void
}

export function MapFilters({ query, onQuery, tag, onTag }: MapFiltersProps) {
  const { tags } = useTags()
  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 flex-wrap pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-card/80 backdrop-blur border border-border px-4 py-2 text-sm text-muted-foreground w-full max-w-sm">
        <Search size={15} />
        <input
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Rechercher un festival, une ville…"
          className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="pointer-events-auto flex gap-1.5 rounded-full bg-card/80 backdrop-blur border border-border p-1 overflow-x-auto max-w-full">
        <button onClick={() => onTag(null)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${tag === null ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Tous</button>
        {tags.map(t => (
          <button key={t.value} onClick={() => onTag(t.value)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${tag === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>
    </div>
  )
}
