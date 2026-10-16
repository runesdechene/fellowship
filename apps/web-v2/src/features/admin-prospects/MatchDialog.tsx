/**
 * QUOI     — la fenêtre « Voir et confirmer » : chaque prospect qui a l'e-mail ou le téléphone d'un
 *            compte, le compte trouvé, la raison, et « Confirmer ».
 * POURQUOI — un admin confirme chaque rapprochement (Uriel, 16/10/2026) ; la confirmation ouvre la
 *            page du prospect, avec le modèle de bienvenue.
 * ATTENTION — plus de correspondance, la fenêtre se ferme seule.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { linkProspect } from './prospect-writes'
import type { Match } from './useProspects'

interface Props {
  matches: Match[]
  onClose: () => void
}

export function MatchDialog({ matches, onClose }: Props) {
  const navigate = useNavigate()
  const dialog = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [problems, setProblems] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    if (matches.length === 0) onClose()
  }, [matches.length, onClose])

  async function link(match: Match) {
    setBusy(match.prospect_id)
    try {
      await linkProspect(match.prospect_id, match.user_id, match.par)
      // La confirmation mène à la page du prospect, la bienvenue prête à écrire.
      void navigate(`/admin/prospects/${match.prospect_id}?modele=bienvenue`)
    } catch (failure) {
      const text = failure instanceof Error ? failure.message : 'Le rapprochement n’a pas abouti.'
      setProblems((previous) => new Map(previous).set(match.prospect_id, text))
    } finally {
      setBusy(null)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog confirm-dialog--wide"
      aria-labelledby="match-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="match-dialog-title" className="confirm-dialog__title">
          Confirmer les nouveaux comptes
        </h2>
        <ul className="prospect-matches">
          {matches.map((match) => (
            <li key={match.prospect_id} className="prospect-match">
              <span className="prospect-match__prospect">
                {match.prospect_name ?? match.prospect_brand ?? 'Prospect sans nom'}
              </span>
              <span className="prospect-match__account">
                <span>{match.user_name ?? 'Sans prénom'}</span>
                <span className="prospect-match__meta">{match.user_email}</span>
              </span>
              <span className="prospect-match__meta">
                {match.par === 'email' ? 'même e-mail' : 'même téléphone'}
              </span>
              <Button variant="action" disabled={busy !== null} onClick={() => void link(match)}>
                {busy === match.prospect_id ? 'Un instant…' : 'Confirmer'}
              </Button>
              {problems.get(match.prospect_id) && (
                <span className="confirm-dialog__problem">{problems.get(match.prospect_id)}</span>
              )}
            </li>
          ))}
        </ul>
        <div className="confirm-dialog__actions">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </dialog>
  )
}
