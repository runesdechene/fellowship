/**
 * QUOI     — la fenêtre « Traiter un signalement » : ce qui est visé, le motif, une note facultative,
 *            puis Rejeter ou Résoudre.
 * POURQUOI — la note garde la trace de la décision pour l'admin suivant (comme dans la V1).
 * ATTENTION — l'élément <dialog> fait le voile, Échap et le piège du focus ; pendant l'écriture,
 *            rien ne ferme la fenêtre.
 */
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { useAuth } from '@/lib/auth'
import { reasonLabel, targetLabel } from '@/lib/moderation'
import { resolveReport, type Report } from './useModeration'

interface Props {
  report: Report
  onClose: () => void
  onDone: () => void
}

export function ResolveDialog({ report, onClose, onDone }: Props) {
  const { person } = useAuth()
  const dialog = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  async function decide(status: 'resolved' | 'dismissed') {
    if (!person) return
    setBusy(true)
    setProblem(null)
    try {
      await resolveReport(report.id, status, note, person.actor_id)
      onDone()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’enregistrement n’a pas abouti.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="resolve-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="resolve-dialog-title" className="confirm-dialog__title">
          Traiter le signalement
        </h2>
        <p className="confirm-dialog__text">
          {targetLabel(report.target_type, report.target_name)} — {reasonLabel(report.reason)}
          {report.comment && ` : « ${report.comment} »`}
        </p>
        <Field label="Note pour l’équipe">
          <Textarea
            rows={3}
            value={note}
            placeholder="Ce qui a été fait, ou pourquoi on ne fait rien"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {problem && <p className="confirm-dialog__problem">{problem}</p>}
        <div className="confirm-dialog__actions">
          <Button onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={() => void decide('dismissed')} disabled={busy}>
            Rejeter
          </Button>
          <Button variant="action" onClick={() => void decide('resolved')} disabled={busy}>
            {busy ? 'Un instant…' : 'Résoudre'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
