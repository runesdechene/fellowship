import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveReport } from '@/hooks/use-content-reports'

interface Props {
  reportId: string
  action: 'resolved' | 'dismissed'
  adminActorId: string
  onClose: () => void
  onResolved: () => void | Promise<void>
}

/** Mini-modale pour saisir un admin_note avant de marquer un signalement résolu/rejeté.
 *  Réutilise les styles .report-modal-* importés par AdminReports.tsx. */
export function ResolveReportModal({ reportId, action, adminActorId, onClose, onResolved }: Props) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const title = action === 'resolved' ? 'Résoudre ce signalement' : 'Rejeter ce signalement'
  const cta = action === 'resolved' ? 'Marquer comme résolu' : 'Rejeter'

  const submit = async () => {
    setSaving(true)
    setError(false)
    const res = await resolveReport(reportId, action, note, adminActorId)
    setSaving(false)
    if (res.ok) {
      await onResolved()
    } else {
      setError(true)
    }
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Fermer"><X strokeWidth={1.8} /></button>
        </div>

        <label className="report-modal-comment">
          <span>Note admin (facultatif)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Action prise, contexte, etc. — pour traçage interne."
            rows={3}
            maxLength={500}
          />
        </label>

        {error && <p className="report-modal-error">Erreur lors de la mise à jour. Réessaie.</p>}

        <div className="report-modal-actions">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '…' : cta}
          </Button>
        </div>
      </div>
    </div>
  )
}
