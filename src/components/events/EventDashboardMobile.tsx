// src/components/events/EventDashboardMobile.tsx
import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { EventDashboard } from './EventDashboard'
import { participationChip } from '@/lib/explorer'
import type { Participation, ParticipationStatus } from '@/types/database'

interface EventDashboardMobileProps {
  participation: Participation | null
  isExposant: boolean
  isPast: boolean
  onUpdate: (p: Participation) => void
  onLeave: () => void
  onJoin: (status: ParticipationStatus, visibility: 'amis' | 'public') => void
  onToggleReport: () => void
  showReportForm: boolean
}


export function EventDashboardMobile(props: EventDashboardMobileProps) {
  const [open, setOpen] = useState(false)
  const { participation } = props

  return (
    <div className="event-mobile-bar">
      {open && (
        <div className="event-mobile-panel">
          <EventDashboard {...props} />
        </div>
      )}
      <div className="event-mobile-bar-collapsed" onClick={() => setOpen(!open)}>
        <div className="event-mobile-bar-badges">
          {participation ? (
            (() => {
              const chip = participationChip(
                participation.status as string,
                (participation.payment_status as string | null) ?? null,
                props.isExposant ? 'entity' : 'person',
                { isPast: props.isPast },
              )
              return chip ? (
                <span className={'event-mobile-status ' + chip.variant}>{chip.label}</span>
              ) : null
            })()
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
              Tu y vas ?
            </span>
          )}
        </div>
        <div className={`event-mobile-bar-toggle ${open ? 'open' : ''}`}>
          <ChevronUp strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}
