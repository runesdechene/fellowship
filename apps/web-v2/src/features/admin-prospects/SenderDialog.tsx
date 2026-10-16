/**
 * QUOI     — la fenêtre d'un expéditeur : le compte admin, l'adresse @equipe.flw.sh, le nom affiché,
 *            la signature, actif ou non.
 * POURQUOI — chaque prospectant a son adresse (Uriel, 16/10/2026). Une adresse désactivée n'envoie
 *            plus mais reçoit toujours ; ses prospects passent à un autre suiveur.
 * ATTENTION — l'élément <dialog> fait le voile, Échap et le piège du focus.
 */
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { reassignProspects, saveSender } from './prospect-writes'
import type { Sender } from './useProspect'
import type { Admin } from './useTemplates'

interface Props {
  sender: Sender | null
  admins: Admin[]
  senders: Sender[]
  onClose: () => void
  onDone: () => void
}

export function SenderDialog({ sender, admins, senders, onClose, onDone }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState({
    user_id: sender?.user_id ?? admins[0]?.actor_id ?? '',
    alias: sender?.alias ?? '',
    display_name: sender?.display_name ?? '',
    signature: sender?.signature ?? '',
    active: sender?.active ?? true,
  })
  const [heir, setHeir] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const leaving = Boolean(sender?.active) && !form.active
  const others = senders.filter((s) => s.active && s.user_id !== sender?.user_id)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  async function save() {
    setBusy(true)
    setProblem(null)
    try {
      if (sender && leaving) await reassignProspects(sender.user_id, heir || null)
      await saveSender({ id: sender?.id, ...form, alias: form.alias.trim().toLowerCase() })
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
      aria-labelledby="sender-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="sender-dialog-title" className="confirm-dialog__title">
          {sender ? 'Modifier l’expéditeur' : 'Ajouter un expéditeur'}
        </h2>
        <label className="template-editor__field">
          <span className="template-editor__label">Compte</span>
          <select
            className="prospect-compose__field"
            value={form.user_id}
            disabled={Boolean(sender)}
            onChange={(event) => setForm({ ...form, user_id: event.target.value })}
          >
            {admins.map((a) => (
              <option key={a.actor_id} value={a.actor_id}>
                {a.display_name ?? 'Sans prénom'}
              </option>
            ))}
          </select>
        </label>
        <label className="template-editor__field">
          <span className="template-editor__label">Adresse</span>
          <span className="sender-dialog__address">
            <input
              className="prospect-compose__field"
              value={form.alias}
              placeholder="uriel"
              onChange={(event) => setForm({ ...form, alias: event.target.value })}
            />
            <span className="template-editor__label">@equipe.flw.sh</span>
          </span>
        </label>
        <label className="template-editor__field">
          <span className="template-editor__label">Nom affiché</span>
          <input
            className="prospect-compose__field"
            value={form.display_name}
            placeholder="Uriel · Fellowship"
            onChange={(event) => setForm({ ...form, display_name: event.target.value })}
          />
        </label>
        <label className="template-editor__field">
          <span className="template-editor__label">Signature</span>
          <textarea
            className="prospect-compose__text"
            rows={3}
            value={form.signature}
            onChange={(event) => setForm({ ...form, signature: event.target.value })}
          />
        </label>
        <label className="sender-dialog__active">
          <input
            type="checkbox"
            className="prospect-check"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
          />
          <span className="template-editor__label">Actif : peut envoyer</span>
        </label>
        {leaving && (
          <label className="template-editor__field">
            <span className="template-editor__label">Ses prospects passent à</span>
            <select
              className="prospect-compose__field"
              value={heir}
              onChange={(event) => setHeir(event.target.value)}
            >
              <option value="">Personne</option>
              {others.map((s) => (
                <option key={s.id} value={s.user_id}>
                  {s.user_name ?? s.display_name}
                </option>
              ))}
            </select>
          </label>
        )}
        {problem && <p className="confirm-dialog__problem">{problem}</p>}
        <div className="confirm-dialog__actions">
          <Button onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button
            variant="action"
            onClick={() => void save()}
            disabled={busy || !form.alias.trim() || !form.display_name.trim() || !form.user_id}
          >
            {busy ? 'Un instant…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
