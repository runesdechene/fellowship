/**
 * QUOI     — la fenêtre qui rouvre les recettes chiffrées : le code de cet appareil s'il en a un,
 *            sinon la phrase de passe ; après la phrase, sur un appareil sans code, « Un code pour
 *            cet appareil ».
 * POURQUOI — les champs posés dans le registre faisaient amateur (Uriel, 01/11/2026) : tout passe
 *            par une fenêtre habillée comme « Chiffrer tes recettes » (apply-dialog.css). Les étapes
 *            du code : maquette 2594:716.
 * ATTENTION — la fenêtre vit dans le registre, jamais dans la ligne verrouillée : dès la clé
 *            ouverte cette ligne disparaît, et l'étape du code doit rester affichée. Une panne de
 *            réseau ne dit JAMAIS « Phrase incorrecte » : l'exposant pourrait tout réinitialiser.
 */
import { Eye, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { hasDeviceKey } from '@/lib/device-key'
import { useRevenueKey } from '@/lib/revenue-key'
import { PhraseInput } from './PhraseInput'
import { PinOffer } from './PinOffer'
import { PinUnlock } from './PinUnlock'

type Step = 'pin' | 'phrase' | 'offer'

const TITLES: Record<Step, string> = {
  pin: 'Code de cet appareil',
  phrase: 'Afficher tes recettes',
  offer: 'Un code pour cet appareil',
}

const PROBLEMS = {
  wrong: 'Phrase incorrecte',
  reset: 'Ta phrase a été réinitialisée',
  offline: 'Connexion impossible, réessaie.',
}

/** `onDone(opened)` : la fenêtre se ferme ; vrai si les recettes ont été ouvertes. */
export function UnlockDialog({ onDone }: { onDone: (opened: boolean) => void }) {
  const { actor } = useAuth()
  const actorId = actor?.id ?? null
  // null tant qu'on ne sait pas si cet appareil garde la clé.
  const [step, setStep] = useState<Step | null>(null)
  const [hasPin, setHasPin] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const opened = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    hasDeviceKey(actorId).then(
      (has) => {
        if (cancelled) return
        setHasPin(has)
        setStep(has ? 'pin' : 'phrase')
      },
      () => {
        if (!cancelled) setStep('phrase')
      },
    )
    return () => {
      cancelled = true
    }
  }, [actorId])

  const shown = step !== null
  useEffect(() => {
    if (shown && !dialog.current?.open) dialog.current?.showModal()
  }, [shown])

  function close() {
    onDone(opened.current)
  }

  function finish() {
    opened.current = true
    onDone(true)
  }

  if (!actorId || step === null) return null
  return (
    <dialog
      ref={dialog}
      className="apply-dialog"
      aria-labelledby="unlock-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="apply-dialog__card">
        <header className="apply-dialog__head">
          <h2 id="unlock-dialog-title" className="apply-dialog__title">
            {TITLES[step]}
          </h2>
          <button type="button" className="apply-dialog__close" onClick={close} aria-label="Fermer">
            <X size={18} strokeWidth={2} />
          </button>
        </header>
        <div className="report-secret__content">
          {step === 'pin' && (
            <PinUnlock
              actorId={actorId}
              onOpen={finish}
              onPhrase={(why) => {
                // Une raison : la clé vient d'être oubliée, l'appareil n'a plus de code.
                if (why !== null) setHasPin(false)
                setNotice(why)
                setStep('phrase')
              }}
            />
          )}
          {step === 'phrase' && (
            <PhraseStep
              notice={notice}
              onOpen={() => {
                opened.current = true
                if (hasPin) finish()
                else setStep('offer')
              }}
            />
          )}
          {step === 'offer' && <PinOffer onDone={finish} />}
        </div>
      </div>
    </dialog>
  )
}

function PhraseStep({ notice, onOpen }: { notice: string | null; onOpen: () => void }) {
  const { unlock } = useRevenueKey()
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setProblem(null)
    const outcome = await unlock(phrase).catch(() => 'offline' as const)
    setBusy(false)
    if (outcome !== 'ok') {
      setProblem(PROBLEMS[outcome])
      return
    }
    onOpen()
  }

  return (
    <form
      className="report-secret__content"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <p className="report-secret__text">
        {notice ?? 'Tape ta phrase de passe : elle ouvre les recettes de tous tes bilans.'}
      </p>
      <label className="ledger__field report-secret__field">
        <span className="ledger__field-label">Phrase de passe</span>
        <PhraseInput
          value={phrase}
          onChange={setPhrase}
          placeholder="ta phrase"
          autoComplete="current-password"
        />
      </label>
      {problem && (
        <p className="report-secret__problem" role="status">
          {problem}
        </p>
      )}
      <button type="submit" className="apply-dialog__go" disabled={busy || phrase.trim() === ''}>
        <Eye size={13} strokeWidth={2} />
        {busy ? 'Un instant…' : 'Afficher mes recettes'}
      </button>
    </form>
  )
}
