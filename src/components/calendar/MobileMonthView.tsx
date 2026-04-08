// src/components/calendar/MobileMonthView.tsx
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import type { CalendarMonth } from '@/hooks/use-calendar'

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  'médiéval': { bg: 'hsl(24 72% 50% / 0.08)', color: 'hsl(24 72% 44%)' },
  'fantastique': { bg: 'hsl(280 50% 55% / 0.08)', color: 'hsl(280 50% 50%)' },
  'geek': { bg: 'hsl(220 70% 50% / 0.08)', color: 'hsl(220 70% 45%)' },
  'marché': { bg: 'hsl(152 32% 45% / 0.08)', color: 'hsl(152 32% 38%)' },
  'salon': { bg: 'hsl(200 50% 45% / 0.08)', color: 'hsl(200 50% 40%)' },
  'foire': { bg: 'hsl(40 80% 50% / 0.08)', color: 'hsl(40 70% 38%)' },
  'musique': { bg: 'hsl(340 60% 55% / 0.08)', color: 'hsl(340 55% 50%)' },
  'littéraire': { bg: 'hsl(190 60% 45% / 0.08)', color: 'hsl(190 60% 40%)' },
  'historique': { bg: 'hsl(10 70% 50% / 0.08)', color: 'hsl(10 70% 45%)' },
}

function getTagStyle(tag: string) {
  const key = Object.keys(TAG_COLORS).find(k => tag.toLowerCase().includes(k))
  return key ? TAG_COLORS[key] : { bg: 'rgba(61,48,40,0.06)', color: 'rgba(61,48,40,0.45)' }
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  inscrit: { color: 'hsl(152 50% 38%)', bg: 'hsl(152 50% 38% / 0.12)', label: '✓' },
  en_cours: { color: 'hsl(210 60% 50%)', bg: 'hsl(210 60% 50% / 0.12)', label: '●' },
  interesse: { color: 'hsl(30 80% 50%)', bg: 'hsl(30 80% 50% / 0.12)', label: '○' },
}

function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth()
  const sameDay = start.getDate() === end.getDate() && sameMonth
  const monthShort = start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')

  if (sameDay) return `${start.getDate()} ${monthShort}`
  if (sameMonth) return `${start.getDate()}-${end.getDate()} ${monthShort}`
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${start.getDate()} ${monthShort} — ${end.getDate()} ${endMonth}`
}

interface MobileMonthViewProps {
  month: CalendarMonth
  onPrevMonth: () => void
  onNextMonth: () => void
  onBackToYear: () => void
}

export function MobileMonthView({ month, onPrevMonth, onNextMonth, onBackToYear }: MobileMonthViewProps) {
  return (
    <div className="mobile-month-view">
      {/* Month nav */}
      <div className="mobile-month-nav">
        <button className="mobile-month-nav-btn" onClick={onPrevMonth}>
          <ChevronLeft strokeWidth={1.5} />
        </button>
        <span className="mobile-month-nav-label">{month.label}</span>
        <button className="mobile-month-nav-btn" onClick={onNextMonth}>
          <ChevronRight strokeWidth={1.5} />
        </button>
      </div>

      {/* Back to year */}
      <button className="mobile-month-back" onClick={onBackToYear}>
        <LayoutGrid strokeWidth={1.5} />
        Vue annuelle
      </button>

      {/* Events */}
      {month.events.length === 0 ? (
        <div className="mobile-month-empty">Aucun événement ce mois-ci</div>
      ) : (
        <div className="mobile-month-events">
          {month.events.map(ev => {
            const tagStyle = getTagStyle(ev.primaryTag)
            const statusCfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.interesse

            return (
              <Link
                key={ev.id}
                to={`/evenement/${ev.id}`}
                className="mobile-event-pill"
                style={{ background: tagStyle.bg }}
              >
                {ev.imageUrl && (
                  <div className="mobile-event-pill-img">
                    <img src={ev.imageUrl} alt="" />
                  </div>
                )}
                <div className="mobile-event-pill-info">
                  <div className="mobile-event-pill-name">{ev.name}</div>
                  <div className="mobile-event-pill-meta">
                    <span>{formatDateRange(ev.startDate, ev.endDate)}</span>
                    <span>·</span>
                    <span>{ev.city} ({ev.department})</span>
                  </div>
                </div>
                {ev.status && (
                  <div
                    className="mobile-event-pill-status"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                    title={ev.status}
                  >
                    {statusCfg.label}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
