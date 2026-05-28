import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Flag, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from '@/lib/content-reports'
import { createContentReport } from '@/hooks/use-content-reports'
import './ReportContentModal.css'

interface Props {
  targetType: ReportTargetType
  targetId: string
  targetLabel: string
  onClose: () => void
}

type State = 'form' | 'sending' | 'sent' | 'duplicate' | 'error'

export function ReportContentModal({ targetType, targetId, targetLabel, onClose }: Props) {
  const { user, currentActor } = useAuth()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [comment, setComment] = useState('')
  const [state, setState] = useState<State>('form')

  const title = targetType === 'event' ? 'Signaler ce festival' : 'Signaler ce profil'

  const submit = async () => {
    if (!user || !currentActor) return
    setState('sending')
    const res = await createContentReport(
      { targetType, targetId, reason, comment },
      { actorId: currentActor.id, authId: user.id }
    )
    if (res.ok) {
      setState('sent')
      setTimeout(onClose, 1800)
    } else if (res.alreadyExists) {
      setState('duplicate')
    } else {
      setState('error')
    }
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-head">
          <h2><Flag strokeWidth={1.8} /> {title}</h2>
          <button onClick={onClose} aria-label="Fermer"><X strokeWidth={1.8} /></button>
        </div>

        <p className="report-modal-target">{targetLabel}</p>

        {state === 'sent' ? (
          <div className="report-modal-success">
            <Check strokeWidth={2.2} />
            <p>Merci, l'équipe va examiner ton signalement.</p>
          </div>
        ) : state === 'duplicate' ? (
          <div className="report-modal-info">
            <AlertTriangle strokeWidth={2} />
            <p>Tu as déjà signalé ce contenu, l'équipe est dessus.</p>
            <Button onClick={onClose}>Fermer</Button>
          </div>
        ) : (
          <>
            <fieldset className="report-modal-reasons">
              <legend>Pourquoi signaler ce contenu ?</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className={reason === r.value ? 'on' : ''}>
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </fieldset>

            <label className="report-modal-comment">
              <span>Détails (facultatif)</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Précise si tu veux…"
                rows={3}
                maxLength={500}
              />
            </label>

            {state === 'error' && (
              <p className="report-modal-error">Erreur lors de l'envoi. Réessaie.</p>
            )}

            <p className="report-modal-charte">
              Avant d'envoyer, jette un œil à la{' '}
              <Link to="/legal/charte-communautaire" target="_blank" rel="noopener noreferrer">
                charte communautaire
              </Link>.
            </p>
            <div className="report-modal-actions">
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button onClick={submit} disabled={state === 'sending'}>
                {state === 'sending' ? 'Envoi…' : 'Envoyer le signalement'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
