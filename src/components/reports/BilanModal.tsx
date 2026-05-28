import { X, Lock } from 'lucide-react'
import { EventReportForm } from './EventReportForm'

interface Props {
  eventId: string
  onClose: () => void
  /** Appelé quand le bilan vient d'être sauvegardé — le parent doit refetch ses données. */
  onSaved?: () => void
}

/** Modale plein écran qui wrappe l'EventReportForm. Après save : ferme + déclenche onSaved. */
export function BilanModal({ eventId, onClose, onSaved }: Props) {
  return (
    <div className="bilan-modal-overlay" onClick={onClose}>
      <div className="bilan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bilan-modal-head">
          <div className="bilan-modal-head-titles">
            <h2>Mon bilan post-festival</h2>
            <span className="bilan-privacy"><Lock strokeWidth={2.2} /> Visible uniquement par toi — aucun admin n'y a accès</span>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X strokeWidth={1.8} /></button>
        </div>
        <div className="bilan-modal-body">
          <EventReportForm
            eventId={eventId}
            onSaved={() => { onSaved?.(); onClose() }}
          />
        </div>
      </div>
    </div>
  )
}
