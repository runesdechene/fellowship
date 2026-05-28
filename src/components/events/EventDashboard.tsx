// src/components/events/EventDashboard.tsx
import { useState, useEffect } from 'react'
import { updateParticipation } from '@/hooks/use-participations'
import type { Participation } from '@/types/database'
import type { ParticipationStatus } from '@/types/database'

interface EventDashboardProps {
  participation: Participation | null
  isExposant: boolean
  onUpdate: (p: Participation) => void
  onLeave: () => void
  onJoin: (status: ParticipationStatus, visibility: 'amis' | 'public') => void
}

// Stepper exposant : 4 statuts (Refusé seulement quand on a déjà postulé).
const STEPS_EXPOSANT = [
  { key: 'interesse' as const, label: 'Repéré' },
  { key: 'en_cours' as const, label: 'Dossier envoyé' },
  { key: 'inscrit' as const, label: 'Accepté' },
]
// Stepper festivalier : 2 toggles simples.
const STEPS_FESTIVALIER = [
  { key: 'interesse' as const, label: 'Repéré' },
  { key: 'inscrit' as const, label: "J'y vais" },
]

// Paiement en 3 étapes : a_payer → acompte_verse (= inscription validée) → paye.
// payment_status a un CHECK constraint en DB ; la migration 20260528220000_payment_status_acompte
// l'a étendu pour accepter 'acompte_verse'.
const PAYMENT_STEPS = [
  { key: 'a_payer', label: 'À payer' },
  { key: 'acompte_verse', label: 'Acompte versé' },
  { key: 'paye', label: 'Payé' },
]

// Messages contextuels selon le rôle (exposant vs festivalier) — affichés en
// éphémère après chaque changement de statut.
const INFO_MESSAGES_EXPOSANT: Record<string, { title: string; text: string }> = {
  interesse: {
    title: '★ Repéré',
    text: 'Tu as repéré ce festival. Tes abonnés peuvent voir que tu y candidates peut-être. Tu recevras les mises à jour.',
  },
  en_cours: {
    title: '📨 Dossier envoyé',
    text: 'Ta candidature est envoyée. Marque « Accepté » dès que l\'organisateur valide ton dossier.',
  },
  inscrit: {
    title: '✦ Accepté',
    text: 'Ton dossier est accepté. Renseigne le paiement ci-dessous. Une fois payé, tu passes « Inscrit ».',
  },
  refuse: {
    title: '✕ Refusé',
    text: 'Dossier refusé — gardé en historique. Clique à nouveau pour retirer.',
  },
}

const INFO_MESSAGES_FESTIVALIER: Record<string, { title: string; text: string }> = {
  interesse: {
    title: '★ Repéré',
    text: 'Tu as repéré ce festival. Tu recevras les mises à jour (dates, infos, etc.).',
  },
  inscrit: {
    title: '🎉 J\'y vais',
    text: 'Tu confirmes ta venue. Tes abonnés voient que tu y vas, et tu recevras les rappels avant le festival.',
  },
}

export function EventDashboard({
  participation,
  isExposant,
  onUpdate,
  onLeave,
  onJoin,
}: EventDashboardProps) {
  const [infoBox, setInfoBox] = useState<string | null>(null)

  // Auto-hide info box after 5 seconds
  useEffect(() => {
    if (!infoBox) return
    const timer = setTimeout(() => setInfoBox(null), 5000)
    return () => clearTimeout(timer)
  }, [infoBox])

  /**
   * Logique toggle :
   *   - clic sur le statut ACTIF → retire la participation (onLeave)
   *   - clic sur un autre statut quand pas de participation → la crée (onJoin)
   *   - clic sur un autre statut quand participation existe → update du status
   */
  const handleStatusToggle = async (status: ParticipationStatus) => {
    if (participation && participation.status === status) {
      onLeave()
      setInfoBox(null)
      return
    }
    if (!participation) {
      const visibility: 'amis' | 'public' = status === 'inscrit' ? 'public' : 'amis'
      onJoin(status, visibility)
      setInfoBox(status)
      return
    }
    const update: { status: ParticipationStatus; visibility?: 'amis' | 'public' } = { status }
    if (status === 'inscrit') update.visibility = 'public'
    const { data } = await updateParticipation(participation.id, update)
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

  const STEPS = isExposant ? STEPS_EXPOSANT : STEPS_FESTIVALIER
  const currentPayment = (participation?.payment_status as string) ?? 'a_payer'
  // Refusé n'a de sens qu'à partir d'une vraie candidature : dossier envoyé,
  // accepté/inscrit, ou déjà refusé (pour pouvoir détoggler). Pas à 'interesse' (Repéré).
  const showRefuse = isExposant && !!participation && (
    participation.status === 'en_cours' ||
    participation.status === 'confirme' ||
    participation.status === 'inscrit' ||
    (participation.status as string) === 'refuse'
  )
  const showPayment = isExposant && participation && (participation.status === 'confirme' || participation.status === 'inscrit')

  return (
    <div className="event-suivi">
      <div className="event-suivi-body">

        <div className="event-suivi-grid">
          {/* Participation stepper — toggles cochables/décochables */}
          <div className="event-suivi-block">
            <div className="event-suivi-block-label">Participation</div>
            <div className="event-stepper">
              {STEPS.map((step) => {
                const active = participation?.status === step.key
                return (
                  <button
                    key={step.key}
                    onClick={() => handleStatusToggle(step.key)}
                    aria-pressed={active}
                    className={`event-stepper-btn ${active ? `pay-active ${step.key}` : 'inactive'}`}
                  >
                    {step.label}
                  </button>
                )
              })}
              {showRefuse && (
                <button
                  onClick={() => handleStatusToggle('refuse' as ParticipationStatus)}
                  aria-pressed={(participation?.status as string) === 'refuse'}
                  className={`event-stepper-btn ${(participation?.status as string) === 'refuse' ? 'pay-active refuse' : 'inactive'}`}
                >
                  Refusé
                </button>
              )}
            </div>
          </div>

          {/* Payment stepper — affiché seulement quand exposant + Accepté/Inscrit */}
          {showPayment && (
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

        {/* Ephemeral info box — message contextuel selon le rôle */}
        {(() => {
          const MESSAGES = isExposant ? INFO_MESSAGES_EXPOSANT : INFO_MESSAGES_FESTIVALIER
          const msg = infoBox ? MESSAGES[infoBox] : null
          if (!msg) return null
          return (
            <div className={`event-info-box ${infoBox}`} onClick={() => setInfoBox(null)}>
              <div className="event-info-box-title">{msg.title}</div>
              <div className="event-info-box-text">{msg.text}</div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
