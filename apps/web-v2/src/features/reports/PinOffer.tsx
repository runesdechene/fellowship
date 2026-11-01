/**
 * QUOI     — « Un code pour cet appareil » : juste après la phrase de passe, choisir 4 chiffres qui
 *            rouvriront les recettes ici (lib/device-key.ts).
 * POURQUOI — maquette 2594:716 (état 1) : la phrase se tape une fois par appareil, le code ensuite
 *            (Uriel, 01/11/2026). « Pas maintenant » : la phrase restera demandée.
 */
import { useState } from 'react'
import { CodeInput } from '@/components/ui/CodeInput'
import { useAuth } from '@/lib/auth'
import { isPin, PIN_LENGTH, storeDeviceKey } from '@/lib/device-key'
import { useRevenueKey } from '@/lib/revenue-key'

export function PinOffer({ onDone }: { onDone: () => void }) {
  const { actor } = useAuth()
  const { key } = useRevenueKey()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function save(pin: string) {
    if (!actor || !key) return
    setBusy(true)
    try {
      await storeDeviceKey(actor.id, key, pin)
      onDone()
    } catch {
      setProblem('Ce navigateur n’a pas pu garder le code : ta phrase restera demandée.')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="report-secret__pin">
      <p className="report-secret__pin-title">Un code pour cet appareil</p>
      <p className="report-secret__hint">
        4 chiffres pour rouvrir tes recettes sur cet appareil seulement, sans retaper ta phrase de
        passe. Chaque appareil a son propre code.
      </p>
      <CodeInput
        length={PIN_LENGTH}
        secret
        value={code}
        disabled={busy}
        onChange={(value) => {
          setCode(value)
          if (isPin(value)) void save(value)
        }}
      />
      {problem && (
        <p className="report-secret__wrong" role="status">
          {problem}
        </p>
      )}
      <button type="button" className="report-secret__switch" onClick={onDone}>
        Pas maintenant
      </button>
    </div>
  )
}
