/**
 * QUOI     — la fenêtre « Ranger sous un prospect » : chercher un prospect, puis y ranger la réponse.
 * POURQUOI — une réponse non classée rejoint le fil du bon prospect (spec messagerie, lot 3c).
 * ATTENTION — l'élément <dialog> fait le voile, Échap et le piège du focus.
 */
import { useEffect, useRef, useState } from 'react'
import { AdminSearch } from '@/components/ui/AdminSearch'
import { Button } from '@/components/ui/Button'
import { must, supabase } from '@/lib/supabase'
import { fileMessage } from './prospect-writes'

const SHOWN = 8

interface Found {
  id: string
  name: string | null
  brand: string | null
  email: string | null
}

interface Props {
  messageId: string
  sender: string
  onClose: () => void
  onFiled: (prospectId: string) => void
}

export function FileDialog({ messageId, sender, onClose, onFiled }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState(sender)
  const [found, setFound] = useState<Found[]>([])
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function search() {
      try {
        const rows: Found[] = must(
          await supabase.rpc('admin_prospects', {
            p_q: q,
            p_filtre: 'tous',
            p_source: '',
            p_suivi: '',
            p_page: 0,
          }),
        )
        if (!cancelled) setFound(rows.slice(0, SHOWN))
      } catch (failure) {
        if (!cancelled)
          setProblem(failure instanceof Error ? failure.message : 'Recherche impossible')
      }
    }
    void search()
    return () => {
      cancelled = true
    }
  }, [q])

  async function file(prospectId: string) {
    setBusy(true)
    setProblem(null)
    try {
      await fileMessage(messageId, prospectId)
      onFiled(prospectId)
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'Le rangement n’a pas abouti.')
      setBusy(false)
    }
  }

  function close() {
    if (!busy) onClose()
  }

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog confirm-dialog--wide"
      aria-labelledby="file-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="file-dialog-title" className="confirm-dialog__title">
          Ranger sous un prospect
        </h2>
        <AdminSearch value={q} placeholder="Nom, marque, e-mail ou téléphone" onSearch={setQ} />
        {found.length === 0 ? (
          <p className="confirm-dialog__text">Aucun prospect ne correspond.</p>
        ) : (
          <ul className="prospect-matches">
            {found.map((p) => (
              <li key={p.id} className="unclassified-choice">
                <span className="prospect-match__account">
                  <span>{p.name ?? p.brand ?? 'Prospect sans nom'}</span>
                  <span className="prospect-match__meta">{p.email ?? '—'}</span>
                </span>
                <Button variant="action" disabled={busy} onClick={() => void file(p.id)}>
                  Ranger
                </Button>
              </li>
            ))}
          </ul>
        )}
        {problem && <p className="confirm-dialog__problem">{problem}</p>}
        <div className="confirm-dialog__actions">
          <Button onClick={close} disabled={busy}>
            Annuler
          </Button>
        </div>
      </div>
    </dialog>
  )
}
