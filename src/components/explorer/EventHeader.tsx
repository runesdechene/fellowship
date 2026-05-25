import type { EventWithScore } from '@/types/database'

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  interesse: { label: '★ Repéré', cls: 'eh-status repere' },
  inscrit: { label: '✓ Tu y vas', cls: 'eh-status going' },
  confirme: { label: '✓ Tu y vas', cls: 'eh-status going' },
  en_cours: { label: '✓ Tu y vas', cls: 'eh-status going' },
}

function dateRange(start: string, end: string): string {
  const s = new Date(start), e = new Date(end)
  const day = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric' })
  const month = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long' })
  if (start === end) return `${day(s)} ${month(s)}`
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${day(s)}–${day(e)} ${month(s)}`
  const sm = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${day(s)} ${sm(s)} – ${day(e)} ${sm(e)}`
}

export function EventHeader({
  event,
  status,
}: {
  event: EventWithScore
  status: string | null
}) {
  const pill = status ? STATUS_PILL[status] : null
  return (
    <div className="event-header">
      {pill && <span className={pill.cls}>{pill.label}</span>}
      <div className="eh-meta">
        <div className="eh-item">
          <span className="eh-ico" aria-hidden="true">📅</span>
          <div className="eh-lines">
            <div className="eh-strong">{dateRange(event.start_date, event.end_date)}</div>
            <div className="eh-sub">{new Date(event.start_date).getFullYear()}</div>
          </div>
        </div>
        <span className="eh-div" aria-hidden="true" />
        <div className="eh-item">
          <span className="eh-ico" aria-hidden="true">📍</span>
          <div className="eh-lines">
            <div className="eh-strong">{event.city}</div>
            {event.department && <div className="eh-sub">Dept. {event.department}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
