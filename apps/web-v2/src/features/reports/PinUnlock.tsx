/**
 * QUOI     — « Code de cet appareil » : quatre cases qui rouvrent les recettes chiffrées au 4ᵉ
 *            chiffre, sans la phrase de passe (lib/device-key.ts).
 * POURQUOI — maquette 2594:716 (états 2 et 3) : après le verrou des 15 minutes, l'appareil qui garde
 *            la clé ne demande que son code (Uriel, 01/11/2026).
 * ATTENTION — la clé rouverte est revérifiée contre la base (adopt) : une phrase changée ou
 *            réinitialisée ailleurs fait oublier la clé, et c'est la phrase qui est redemandée.
 */
import { useState } from 'react'
import { CodeInput } from '@/components/ui/CodeInput'
import { forgetDeviceKey, isPin, openDeviceKey, PIN_LENGTH } from '@/lib/device-key'
import { useRevenueKey } from '@/lib/revenue-key'

interface Props {
  actorId: string
  onOpen: () => void
  /** Retour à la phrase, avec la raison à afficher (null : l'exposant l'a choisi). */
  onPhrase: (notice: string | null) => void
}

const FORGOTTEN =
  'Cet appareil a oublié ta clé : tape ta phrase de passe, tu choisiras un nouveau code.'

export function PinUnlock({ actorId, onOpen, onPhrase }: Props) {
  const { adopt } = useRevenueKey()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function attempt(pin: string) {
    setBusy(true)
    try {
      const outcome = await openDeviceKey(actorId, pin)
      if (outcome.kind === 'forgotten') {
        onPhrase(FORGOTTEN)
        return
      }
      if (outcome.kind === 'wrong') {
        setProblem(
          `Ce n’est pas le bon code. Encore ${String(outcome.left)} essai${outcome.left > 1 ? 's' : ''}.`,
        )
        setCode('')
        return
      }
      const adopted = await adopt(outcome.key)
      if (adopted === 'ok') {
        onOpen()
        return
      }
      await forgetDeviceKey(actorId)
      onPhrase(
        adopted === 'reset'
          ? 'Ta phrase a été réinitialisée.'
          : 'Ta phrase a changé sur un autre appareil : tape la nouvelle.',
      )
    } catch {
      setProblem('Le code n’a pas pu être vérifié, réessaie.')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="report-secret__pin">
      <p className="report-secret__pin-title">Code de cet appareil</p>
      <CodeInput
        length={PIN_LENGTH}
        secret
        value={code}
        invalid={problem !== null}
        disabled={busy}
        autoFocus={problem !== null}
        onChange={(value) => {
          setCode(value)
          setProblem(null)
          if (isPin(value)) void attempt(value)
        }}
      />
      {problem ? (
        <p className="report-secret__wrong" role="status">
          {problem}
        </p>
      ) : (
        <p className="report-secret__hint">
          {busy ? 'Un instant…' : 'Les recettes s’affichent au 4ᵉ chiffre.'}
        </p>
      )}
      <button
        type="button"
        className="report-secret__switch"
        onClick={() => {
          onPhrase(null)
        }}
      >
        Utiliser ma phrase de passe
      </button>
    </div>
  )
}
