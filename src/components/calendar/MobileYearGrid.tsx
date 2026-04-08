// src/components/calendar/MobileYearGrid.tsx
import type { CalendarMonth } from '@/hooks/use-calendar'

const TAG_COLORS: Record<string, string> = {
  'médiéval': 'hsl(24 72% 50%)',
  'fantastique': 'hsl(280 50% 55%)',
  'geek': 'hsl(220 70% 50%)',
  'marché': 'hsl(152 32% 45%)',
  'salon': 'hsl(200 50% 45%)',
  'foire': 'hsl(40 80% 50%)',
  'musique': 'hsl(340 60% 55%)',
  'littéraire': 'hsl(190 60% 45%)',
  'historique': 'hsl(10 70% 50%)',
}

function getTagDotColor(tag: string): string {
  const key = Object.keys(TAG_COLORS).find(k => tag.toLowerCase().includes(k))
  return key ? TAG_COLORS[key] : 'rgba(61,48,40,0.3)'
}

interface MobileYearGridProps {
  months: CalendarMonth[]
  currentMonth: number
  currentYear: number
  onSelectMonth: (monthIndex: number) => void
}

const MONTH_ABBR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const MAX_VISIBLE = 2

export function MobileYearGrid({ months, currentMonth, currentYear, onSelectMonth }: MobileYearGridProps) {
  return (
    <div className="mobile-year-grid">
      {months.map((month, i) => {
        const isCurrent = month.year === currentYear && month.month === currentMonth
        const isEmpty = month.events.length === 0
        const visible = month.events.slice(0, MAX_VISIBLE)
        const overflow = month.events.length - MAX_VISIBLE

        return (
          <button
            key={`${month.year}-${month.month}`}
            className={`mobile-year-cell ${isCurrent ? 'current' : ''} ${isEmpty ? 'empty' : ''}`}
            onClick={() => onSelectMonth(i)}
          >
            <div className={`mobile-year-cell-label ${isCurrent ? 'current' : ''}`}>
              {MONTH_ABBR[month.month]}
            </div>
            {isEmpty ? (
              <div className="mobile-year-cell-empty">—</div>
            ) : (
              <div className="mobile-year-cell-events">
                {visible.map(ev => (
                  <div key={ev.id} className="mobile-year-cell-event">
                    <div
                      className="mobile-year-cell-dot"
                      style={{ background: getTagDotColor(ev.primaryTag) }}
                    />
                    <span className="mobile-year-cell-name">{ev.name}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="mobile-year-cell-overflow">+{overflow}</div>
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
