/**
 * QUOI     — « Signaler ce profil » au pied de la vitrine, et sa fenêtre : le motif, un commentaire
 *            facultatif, puis « Merci, on regarde. ».
 * POURQUOI — maquette 2076:699. Le signalement arrive dans l'administration (features/admin-moderation).
 * ATTENTION — l'insertion passe par la politique de `content_reports` : l'auteur est le compte
 *            connecté (`reporter_auth_id`) agissant pour l'acteur actif (`reporter_actor_id`).
 */
import { Flag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { useAuth } from '@/lib/auth'
import { REASONS, type ReportReason } from '@/lib/moderation'
import { supabase } from '@/lib/supabase'

function ReportDialog({ targetId, onClose }: { targetId: string; onClose: () => void }) {
  const { user, actor } = useAuth()
  const dialog = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState<ReportReason>('inapproprie')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  async function send() {
    if (!user || !actor) return
    setBusy(true)
    setProblem(null)
    const { error } = await supabase.from('content_reports').insert({
      reporter_auth_id: user.id,
      reporter_actor_id: actor.id,
      target_type: 'profile',
      target_id: targetId,
      reason,
      comment: comment.trim() || null,
    })
    setBusy(false)
    if (error) setProblem(error.message)
    else setSent(true)
  }

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="report-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="report-dialog-title" className="confirm-dialog__title">
          {sent ? 'Merci, on regarde.' : 'Signaler ce profil'}
        </h2>
        {sent ? (
          <p className="confirm-dialog__text">
            L’équipe lit chaque signalement et décide de la suite.
          </p>
        ) : (
          <>
            <Field label="Ce qui ne va pas">
              <select
                className="control"
                value={reason}
                onChange={(event) =>
                  setReason(REASONS.find((r) => r.value === event.target.value)?.value ?? reason)
                }
              >
                {REASONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Un mot de plus (facultatif)">
              <Textarea
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </Field>
          </>
        )}
        {problem && <p className="confirm-dialog__problem">{problem}</p>}
        <div className="confirm-dialog__actions">
          {sent ? (
            <Button variant="action" onClick={close}>
              Fermer
            </Button>
          ) : (
            <>
              <Button onClick={close} disabled={busy}>
                Annuler
              </Button>
              <Button variant="action" onClick={() => void send()} disabled={busy}>
                {busy ? 'Un instant…' : 'Signaler'}
              </Button>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}

export function ReportProfile({ targetId }: { targetId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="vitrine__report" onClick={() => setOpen(true)}>
        <Flag size={14} strokeWidth={1.75} aria-hidden="true" />
        Signaler ce profil
      </button>
      {open && <ReportDialog targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  )
}
