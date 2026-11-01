/**
 * QUOI     — « Verrouiller » : remasque tout de suite les recettes chiffrées ouvertes, sans attendre
 *            les 15 minutes. Rien n'est affiché tant qu'elles sont verrouillées.
 * POURQUOI — Uriel, 01/11/2026 : pouvoir cacher son chiffre d'un geste, près de « Mes bilans ». Le
 *            code de l'appareil (ou la phrase) les rouvre.
 */
import { Lock } from 'lucide-react'
import { useRevenueKey } from '@/lib/revenue-key'

export function LockRevenue() {
  const { status, lock } = useRevenueKey()
  if (status !== 'open') return null
  return (
    <button type="button" className="revenue-lock" onClick={lock}>
      <Lock size={13} strokeWidth={2} />
      Verrouiller
    </button>
  )
}
