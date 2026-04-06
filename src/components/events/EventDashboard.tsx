// src/components/events/EventDashboard.tsx
import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateParticipation } from '@/hooks/use-participations'
import type { Participation } from '@/types/database'
import type { ParticipationStatus } from '@/types/database'

interface EventDashboardProps {
  participation: Participation | null
  isExposant: boolean
  isPast: boolean
  onUpdate: (p: Participation) => void
  onLeave: () => void
  onJoin: (status: ParticipationStatus, visibility: 'amis' | 'public') => void
  onToggleReport: () => void
  showReportForm: boolean
}

const PARTICIPATION_STEPS = [
  { key: 'interesse' as const, label: 'Intéressé' },
  { key: 'en_cours' as const, label: 'En cours' },
  { key: 'inscrit' as const, label: 'Inscrit' },
]

const PAYMENT_STEPS = [
  { key: 'a_payer', label: 'À payer' },
  { key: 'en_cours_paiement', label: 'En cours' },
  { key: 'paye', label: 'Payé' },
]

const INFO_MESSAGES: Record<string, { title: string; text: string }> = {
  interesse: {
    title: '👀 Intéressé',
    text: 'Tes amis peuvent voir que tu t\'intéresses à cet événement. Tu recevras les notifications de mise à jour.',
  },
  en_cours: {
    title: '📋 En cours d\'inscription',
    text: 'Tes amis voient que tu es en cours d\'inscription. Tu recevras les notifications de mise à jour.',
  },
  inscrit: {
    title: '✓ Inscrit',
    text: 'Ton public peut voir que tu participes. L\'événement apparaît sur ton calendrier live.',
  },
}

export function EventDashboard({
  participation,
  isExposant,
  isPast,
  onUpdate,
  onLeave,
  onJoin,
  onToggleReport,
  showReportForm,
}: EventDashboardProps) {
  const [infoBox, setInfoBox] = useState<string | null>(null)

  // Auto-hide info box after 5 seconds
  useEffect(() => {
    if (!infoBox) return
    const timer = setTimeout(() => setInfoBox(null), 5000)
    return () => clearTimeout(timer)
  }, [infoBox])

  const handleStatusChange = async (status: ParticipationStatus) => {
    if (!participation) return
    const { data } = await updateParticipation(participation.id, { status })
    if (data) {
      onUpdate(data)
      setInfoBox(status)
    }
  }

  const handlePaymentChange = async (paymentStatus: string) => {
    if (!participation) return
    const { data } = await updateParticipation(participation.id, { payment_status: paymentStatus })
    if (data) onUpdate(data)
  }

  // CTA — no participation yet
  if (!participation) {
    return (
      <div className="event-suivi">
        <div className="event-suivi-header">Ma participation à cet événement</div>
        <div className="event-suivi-body">
          <div className="event-cta">
            <p className="event-cta-title">Tu y vas ?</p>
            <div className="event-cta-buttons">
              {isExposant ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => onJoin('interesse', 'amis')}>Intéressé</Button>
                  <Button size="sm" variant="outline" onClick={() => onJoin('en_cours', 'amis')}>En cours d'inscription</Button>
                  <Button size="sm" onClick={() => onJoin('inscrit', 'amis')}>Inscrit</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => onJoin('interesse', 'amis')}>Intéressé</Button>
                  <Button size="sm" onClick={() => onJoin('inscrit', 'public')}>J'y vais !</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Public user — simple view
  if (!isExposant) {
    return (
      <div className="event-suivi">
        <div className="event-suivi-header">Ma participation à cet événement</div>
        <div className="event-suivi-body">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-medium text-sm">
              {participation.status === 'interesse' ? 'Intéressé' : "J'y vais !"}
            </span>
          </div>
          <button className="event-suivi-action destructive" onClick={onLeave}>
            Retirer ma participation
          </button>
        </div>
      </div>
    )
  }

  // Exposant — full dashboard
  const currentPayment = (participation.payment_status as string) ?? 'a_payer'

  return (
    <div className="event-suivi">
      <div className="event-suivi-header">Ma participation à cet événement</div>
      <div className="event-suivi-body">

      <div className="event-suivi-grid">
        {/* Participation stepper */}
        <div className="event-suivi-block">
          <div className="event-suivi-block-label">Participation</div>
          <div className="event-stepper">
            {PARTICIPATION_STEPS.map((step) => (
              <button
                key={step.key}
                onClick={() => handleStatusChange(step.key)}
                className={`event-stepper-btn ${
                  step.key === participation.status
                    ? `pay-active ${step.key}`
                    : 'inactive'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment stepper — only when inscrit */}
        {participation.status === 'inscrit' && (
          <div className="event-suivi-block">
            <div className="event-suivi-block-label">Paiement</div>
            <div className="event-stepper">
              {PAYMENT_STEPS.map(step => (
                <button
                  key={step.key}
                  onClick={() => handlePaymentChange(step.key)}
                  className={`event-stepper-btn ${
                    currentPayment === step.key
                      ? `pay-active ${step.key}`
                      : 'inactive'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ephemeral info box */}
      {infoBox && INFO_MESSAGES[infoBox] && (
        <div className={`event-info-box ${infoBox}`} onClick={() => setInfoBox(null)}>
          <div className="event-info-box-title">{INFO_MESSAGES[infoBox].title}</div>
          <div className="event-info-box-text">{INFO_MESSAGES[infoBox].text}</div>
        </div>
      )}

      {/* Actions */}
      <div className="event-suivi-actions">
        {isPast && (
          <button className="event-suivi-action" onClick={onToggleReport}>
            <FileText style={{ width: 14, height: 14 }} strokeWidth={1.5} />
            {showReportForm ? 'Fermer le bilan' : 'Bilan post-événement'}
          </button>
        )}
        <button className="event-suivi-action destructive" onClick={onLeave}>
          Se désinscrire
        </button>
      </div>
      </div>
    </div>
  )
}
