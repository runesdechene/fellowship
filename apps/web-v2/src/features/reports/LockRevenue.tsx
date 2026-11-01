/**
 * QUOI     — la bascule des recettes chiffrées, près de « Mes bilans » : « Verrouiller » quand elles
 *            sont ouvertes, la gélule « Déverrouiller » quand elles sont masquées (elle ouvre
 *            UnlockDialog sur place). Rien sans phrase de passe.
 * POURQUOI — Uriel, 01/11/2026 : cacher son chiffre d'un geste, et le rouvrir d'où on le voit masqué.
 */
import { Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { useRevenueKey } from '@/lib/revenue-key'
import { UnlockDialog } from './UnlockDialog'

export function LockRevenue() {
  const { status, lock } = useRevenueKey()
  const [unlocking, setUnlocking] = useState(false)

  if (status === 'open') {
    return (
      <button type="button" className="revenue-lock" onClick={lock}>
        <Lock size={13} strokeWidth={2} />
        Verrouiller
      </button>
    )
  }
  if (status !== 'locked') return null
  return (
    <>
      <button
        type="button"
        className="revenue-lock revenue-lock--pill"
        onClick={() => {
          setUnlocking(true)
        }}
      >
        <LockOpen size={13} strokeWidth={2} />
        Déverrouiller
      </button>
      {unlocking && (
        <UnlockDialog
          onDone={() => {
            setUnlocking(false)
          }}
        />
      )}
    </>
  )
}
