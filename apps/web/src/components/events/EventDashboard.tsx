// src/components/events/EventDashboard.tsx
import { useState, useEffect } from 'react'
import { updateParticipation } from '@/hooks/use-participations'
import { useAuth } from '@/lib/auth'
import { upsertStepperLedgerLine, ensureReportId, useEventLedger } from '@/hooks/use-ledger'
import type { Participation } from '@/types/database'
import type { ParticipationStatus, PaymentOrientation } from '@/types/database'

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

// Paiement en 3 étapes : a_payer → acompte_verse → paye.
// payment_status a un CHECK constraint en DB ; la migration 20260528220000_payment_status_acompte
// l'a étendu pour accepter 'acompte_verse'.
// Labels selon l'orientation : je paie ma place vs on me paie pour venir.
const PAYMENT_STEPS_PAYEUR = [
  { key: 'a_payer', label: 'À payer' },
  { key: 'acompte_verse', label: 'Acompte versé' },
  { key: 'paye', label: 'Payé' },
]
const PAYMENT_STEPS_PAYE = [
  { key: 'a_payer', label: 'À recevoir' },
  { key: 'acompte_verse', label: 'Acompte reçu' },
  { key: 'paye', label: 'Reçu' },
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
  const { currentActor } = useAuth()
  const orientation: PaymentOrientation =
    (((participation as { payment_orientation?: PaymentOrientation } | null)?.payment_orientation) ?? 'payeur')
  // Champ montant inline ouvert quand on clique acompte/payé.
  const [amountDraft, setAmountDraft] = useState('')
  const [amountOpen, setAmountOpen] = useState(false)
  // Montant déjà saisi (ligne « stepper » du registre) — relu pour l'afficher en permanence.
  const { entries: ledgerEntries, refetch: refetchLedger } = useEventLedger(participation?.event_id)
  const paidAmount = ledgerEntries.find(e => e.source === 'stepper')?.amount ?? 0
  // Pré-remplit la saisie avec le montant existant pour qu'il soit éditable, pas à ressaisir.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (paidAmount > 0) setAmountDraft(String(paidAmount)) }, [paidAmount])

  // Auto-hide info box after 5 seconds
  useEffect(() => {
    if (!infoBox) return
    const timer = setTimeout(() => setInfoBox(null), 5000)
    return () => clearTimeout(timer)
  }, [infoBox])

  // Note « pourquoi ce refus » (#8) : capturée à chaud quand le dossier est Refusé, éditable.
  const [refusalNote, setRefusalNote] = useState((participation?.refusal_note as string | null) ?? '')
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRefusalNote((participation?.refusal_note as string | null) ?? '') }, [participation?.id, participation?.refusal_note])

  const saveRefusalNote = async () => {
    if (!participation) return
    const cur = (participation.refusal_note as string | null) ?? ''
    if (cur === refusalNote.trim()) return
    const { data } = await updateParticipation(participation.id, { refusal_note: refusalNote.trim() || null })
    if (data) onUpdate(data)
  }

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

  const handleOrientationChange = async (next: PaymentOrientation) => {
    if (!participation || next === orientation) return
    const { data } = await updateParticipation(participation.id, { payment_orientation: next } as never)
    if (data) {
      onUpdate(data)
      // Ré-oriente la ligne stepper existante (montant préservé) si un montant est saisi.
      if (currentActor) {
        const reportId = await ensureReportId(currentActor.id, participation.event_id)
        const amt = parseFloat(amountDraft) || 0
        if (reportId && amt > 0) {
          await upsertStepperLedgerLine({ reportId, actorId: currentActor.id, eventId: participation.event_id, amount: amt, orientation: next })
          await refetchLedger()
        }
      }
    }
  }

  const handlePaymentChange = async (paymentStatus: string) => {
    if (!participation) return
    const { data } = await updateParticipation(participation.id, { payment_status: paymentStatus })
    if (data) onUpdate(data)
    // Ouvre la capture du montant quand on marque acompte/payé.
    if (paymentStatus === 'acompte_verse' || paymentStatus === 'paye') setAmountOpen(true)
  }

  const saveAmount = async () => {
    if (!participation || !currentActor) return
    const amt = parseFloat(amountDraft) || 0
    const reportId = await ensureReportId(currentActor.id, participation.event_id)
    if (reportId) {
      await upsertStepperLedgerLine({
        reportId, actorId: currentActor.id, eventId: participation.event_id,
        amount: amt, orientation,
      })
      await refetchLedger()
    }
    setAmountOpen(false)
  }

  const STEPS = isExposant ? STEPS_EXPOSANT : STEPS_FESTIVALIER
  const PAYMENT_STEPS = orientation === 'paye' ? PAYMENT_STEPS_PAYE : PAYMENT_STEPS_PAYEUR
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

          {/* Note du refus (#8) — capturée à chaud, ré-éditable ici ou au Cockpit */}
          {(participation?.status as string) === 'refuse' && (
            <div className="event-suivi-block">
              <div className="event-suivi-block-label">Pourquoi ce refus ? (optionnel)</div>
              <textarea
                className="event-refusal-note"
                value={refusalNote}
                onChange={e => setRefusalNote(e.target.value)}
                onBlur={saveRefusalNote}
                placeholder="Ex : trop cher, dates en conflit, pas le bon public…"
                rows={2}
              />
            </div>
          )}

          {/* Payment stepper — affiché seulement quand exposant + Accepté/Inscrit */}
          {showPayment && (
            <div className="event-suivi-block">
              <div className="event-suivi-block-label">Paiement</div>
              {/* Toggle orientation : je paie ma place / on me paie pour venir */}
              <div className="event-orientation-toggle">
                <button
                  className={`event-orient-btn ${orientation === 'payeur' ? 'active' : ''}`}
                  onClick={() => handleOrientationChange('payeur')}
                >Je paie ma place</button>
                <button
                  className={`event-orient-btn ${orientation === 'paye' ? 'active' : ''}`}
                  onClick={() => handleOrientationChange('paye')}
                >On me paie pour venir</button>
              </div>
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
              {amountOpen && (
                <div className="event-amount-capture">
                  <label>{orientation === 'paye' ? 'Montant du cachet (€)' : 'Prix versé de la place (€)'}</label>
                  <div className="event-amount-row">
                    <input
                      type="number" inputMode="decimal" autoFocus
                      value={amountDraft}
                      onChange={e => setAmountDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveAmount() }}
                      placeholder="Ex : 120"
                    />
                    <button className="event-amount-save" onClick={saveAmount}>OK</button>
                  </div>
                  <small>Enregistré dans ton bilan, tu ne l'oublieras pas.</small>
                </div>
              )}
              {/* Montant payé/reçu — toujours visible dès qu'un acompte/paiement est posé. Clic = éditer. */}
              {!amountOpen && (currentPayment === 'acompte_verse' || currentPayment === 'paye') && paidAmount > 0 && (
                <button
                  type="button"
                  className={`event-amount-paid ${currentPayment}`}
                  onClick={() => { setAmountDraft(String(paidAmount)); setAmountOpen(true) }}
                  title="Modifier le montant"
                >
                  <span className="event-amount-paid-label">
                    {PAYMENT_STEPS.find(s => s.key === currentPayment)?.label}
                  </span>
                  <span className="event-amount-paid-value">{paidAmount.toLocaleString('fr-FR')} €</span>
                </button>
              )}
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
