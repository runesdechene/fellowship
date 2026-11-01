/**
 * QUOI     — ce qui rouvre les recettes chiffrées du registre : le code de l'appareil s'il garde la
 *            clé (PinUnlock), sinon la ligne « Phrase de passe » + « Afficher », qui dit pourquoi
 *            elle ne s'ouvre pas.
 * POURQUOI — maquette 2566:524 / 2574:518 : des recettes chiffrées et verrouillées se lisent en
 *            tapant la phrase une fois ; toutes les dates s'ouvrent avec elle (lib/revenue-key.tsx).
 *            Maquette 2594:716 : ensuite, l'appareil ne demande plus que son code.
 * ATTENTION — la dérivation de la clé prend une seconde (600 000 tours) : le bouton se bloque
 *            pendant ce temps. Le texte d'aide est plus court sur téléphone, comme la maquette.
 *            Une panne de réseau ne dit JAMAIS « Phrase incorrecte » : l'exposant pourrait
 *            réinitialiser sa phrase et tout perdre.
 */
import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { hasDeviceKey } from '@/lib/device-key'
import { useRevenueKey } from '@/lib/revenue-key'
import { PhraseInput } from './PhraseInput'
import { PinUnlock } from './PinUnlock'

const PROBLEMS = {
  wrong: 'Phrase incorrecte',
  reset: 'Ta phrase a été réinitialisée',
  offline: 'Connexion impossible, réessaie.',
}

/** `onOpen(offerPin)` : vrai si la phrase vient d'ouvrir la clé sur un appareil sans code. */
export function UnlockRow({ onOpen }: { onOpen?: (offerPin: boolean) => void }) {
  const { actor } = useAuth()
  const actorId = actor?.id ?? null
  // null tant qu'on ne sait pas si cet appareil garde la clé.
  const [mode, setMode] = useState<'pin' | 'phrase' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // L'appareil a un code, mais l'exposant a préféré sa phrase.
  const [pinChosenAway, setPinChosenAway] = useState(false)

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    hasDeviceKey(actorId).then(
      (has) => {
        if (!cancelled) setMode(has ? 'pin' : 'phrase')
      },
      () => {
        if (!cancelled) setMode('phrase')
      },
    )
    return () => {
      cancelled = true
    }
  }, [actorId])

  if (mode === null || !actorId) return null
  if (mode === 'pin') {
    return (
      <PinUnlock
        actorId={actorId}
        onOpen={() => onOpen?.(false)}
        onPhrase={(why) => {
          setNotice(why)
          setPinChosenAway(why === null)
          setMode('phrase')
        }}
      />
    )
  }
  // Une raison affichée veut dire que la clé vient d'être oubliée ; sans raison, l'exposant a choisi
  // la phrase alors que l'appareil garde son code : on ne le lui redemande pas.
  return <PhraseUnlock notice={notice} onOpen={() => onOpen?.(!pinChosenAway)} />
}

function PhraseUnlock({ notice, onOpen }: { notice: string | null; onOpen: () => void }) {
  const { unlock } = useRevenueKey()
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [phone] = useState(() => window.matchMedia('(width <= 760px)').matches)

  async function submit() {
    setBusy(true)
    setProblem(null)
    const outcome = await unlock(phrase).catch(() => 'offline' as const)
    setBusy(false)
    if (outcome !== 'ok') {
      setProblem(PROBLEMS[outcome])
      return
    }
    setPhrase('')
    onOpen()
  }

  return (
    <form
      className="report-secret__unlock"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {notice && <p className="report-secret__hint report-secret__notice">{notice}</p>}
      <label className="ledger__field report-secret__phrase">
        <span className="ledger__field-label">Phrase de passe</span>
        <PhraseInput
          value={phrase}
          onChange={setPhrase}
          placeholder={phone ? 'ta phrase' : 'tape ta phrase pour afficher tes recettes'}
          autoComplete="current-password"
        />
      </label>
      <button type="submit" className="ledger__submit" disabled={busy || phrase.trim() === ''}>
        <Eye size={14} strokeWidth={2} />
        Afficher
      </button>
      {problem && (
        <p className="report-secret__wrong" role="status">
          {problem}
        </p>
      )}
    </form>
  )
}
