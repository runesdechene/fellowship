// src/components/events/EventDashboardMobile.tsx
import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { EventDashboard } from './EventDashboard'
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

const STATUS_LABELS: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

const PAYMENT_LABELS: Record<string, string> = {
  a_payer: 'À payer',
  en_cours_paiement: 'En cours',
  paye: 'Payé',
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
            <>
              <span
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'white',
                  padding: '3px 10px',
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {STATUS_LABELS[participation.status] ?? participation.status}
              </span>
              {participation.status === 'inscrit' && participation.payment_status && (
                <span
                  style={{
                    background: participation.payment_status === 'paye' ? 'hsl(152 50% 38% / 0.12)' : 'hsl(var(--muted))',
                    color: participation.payment_status === 'paye' ? 'hsl(152 50% 32%)' : 'rgba(61,48,40,0.5)',
                    padding: '3px 10px',
                    borderRadius: 16,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {PAYMENT_LABELS[(participation.payment_status as string)] ?? ''}
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))' }}>
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
