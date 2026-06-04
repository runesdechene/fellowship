import { getTagEmoji } from '@/components/ui/TagBadge'
import { formatDateRange } from '@/lib/calendar-format'
import type { MapFeature } from '@/lib/map-data'

interface EventPanelProps {
  features: MapFeature[]
  onSelect: (slug: string | null, id: string) => void
}

export function EventPanel({ features, onSelect }: EventPanelProps) {
  return (
    <div className="absolute z-10 bg-card/85 backdrop-blur border border-border shadow-2xl
        md:top-20 md:right-3 md:w-80 md:rounded-2xl md:max-h-[70vh]
        bottom-0 left-0 right-0 rounded-t-2xl max-h-[45vh] overflow-y-auto p-4">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-3">
        {features.length} festival{features.length > 1 ? 's' : ''} dans la vue
      </h2>
      <div className="space-y-1">
        {features.map(f => {
          const p = f.properties
          return (
            <button key={p.id} onClick={() => onSelect(p.slug, p.id)}
              className="w-full flex gap-3 p-2.5 rounded-xl hover:bg-accent text-left transition-colors">
              <div className="w-10 h-10 rounded-lg flex-none flex items-center justify-center text-lg border border-border"
                style={{ background: 'linear-gradient(135deg,#3a2a20,#241917)' }}>{getTagEmoji(p.primaryTag)}</div>
              <div className="min-w-0">
                <div className="font-display font-bold text-sm truncate">{p.name}</div>
                <div className="text-xs"><span className="text-primary font-semibold">{formatDateRange(new Date(p.startDate), new Date(p.endDate))}</span> · <span className="text-muted-foreground">{p.city}</span></div>
              </div>
            </button>
          )
        })}
        {features.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Déplace la carte pour voir des festivals.</p>}
      </div>
    </div>
  )
}
