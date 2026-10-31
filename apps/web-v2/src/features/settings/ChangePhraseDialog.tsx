/**
 * QUOI     — la fenêtre « Changer ta phrase de passe » d'une enseigne : phrase actuelle, nouvelle
 *            phrase deux fois, l'avertissement habituel.
 * POURQUOI — maquette 2587:589 : changer de phrase ne perd rien. Les recettes sont déchiffrées avec
 *            l'ancienne et rechiffrées avec la nouvelle sur l'appareil, puis tout s'écrit d'un bloc
 *            (useRevenueKey().rekey, rekey_revenue).
 * ATTENTION — habillée comme « Chiffrer tes recettes » (apply-dialog.css, report-secret.css) ; pendant
 *            le rechiffrement, rien ne ferme la fenêtre.
 */
import { Lock, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SecretField } from '@/features/reports/EncryptDialog'
import { isStrongPassphrase, MIN_PASSPHRASE_LENGTH } from '@/lib/cipher'
import { RevenueKeyError, useRevenueKey } from '@/lib/revenue-key'

interface Props {
  actorId: string
  brandName: string
  onDone: () => void
  onClose: () => void
}

export function ChangePhraseDialog({ actorId, brandName, onDone, onClose }: Props) {
  const { rekey } = useRevenueKey()
  const [current, setCurrent] = useState('')
  const [phrase, setPhrase] = useState('')
  const [again, setAgain] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  async function submit() {
    if (!isStrongPassphrase(phrase)) {
      setProblem(`Choisis une phrase d’au moins ${MIN_PASSPHRASE_LENGTH} caractères.`)
      return
    }
    if (phrase !== again) {
      setProblem('Les deux phrases ne sont pas les mêmes.')
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      if ((await rekey(actorId, current, phrase)) === 'wrong') {
        setProblem('Phrase incorrecte')
        setBusy(false)
        return
      }
      onDone()
    } catch (reason) {
      setProblem(
        reason instanceof RevenueKeyError ? reason.message : 'Connexion impossible, réessaie.',
      )
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="apply-dialog"
      aria-labelledby="change-phrase-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <form
        className="apply-dialog__card"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <header>
          <h2 id="change-phrase-title" className="apply-dialog__title">
            Changer ta phrase de passe
          </h2>
          <p className="apply-dialog__subtitle">{brandName}</p>
        </header>

        <div className="report-secret__content">
          <p className="report-secret__text">
            Tes recettes sont déchiffrées avec l’ancienne phrase puis rechiffrées avec la nouvelle,
            ici, sur ton appareil : rien ne passe en clair par nos serveurs. Garde la page ouverte
            jusqu’à la fin.
          </p>
          <SecretField
            label="Phrase actuelle"
            placeholder="celle que tu utilises aujourd’hui"
            value={current}
            onChange={setCurrent}
            secret
          />
          <SecretField
            label="Nouvelle phrase"
            placeholder={`${MIN_PASSPHRASE_LENGTH} caractères au moins`}
            value={phrase}
            onChange={setPhrase}
            secret
          />
          <SecretField
            label="Encore une fois"
            placeholder="la même phrase"
            value={again}
            onChange={setAgain}
            secret
          />
          <p className="report-secret__warning">
            <TriangleAlert size={15} strokeWidth={1.5} />
            Phrase oubliée, recettes perdues : personne ne pourra les retrouver, pas même nous. Elle
            sert pour tous tes bilans, sur tous tes appareils.
          </p>
          {problem && (
            <p className="report-secret__problem" role="status">
              {problem}
            </p>
          )}
        </div>

        <button type="submit" className="apply-dialog__go" disabled={busy}>
          <Lock size={13} strokeWidth={2} />
          {busy ? 'Un instant…' : 'Changer la phrase'}
        </button>
      </form>
    </dialog>
  )
}
