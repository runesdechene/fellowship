/**
 * QUOI     — les comptes officiels, lus une fois par session et partagés.
 * POURQUOI — le badge paraît à côté de chaque nom : une liste à l'écran ne relit pas la base par nom.
 * ATTENTION — tant que la lecture n'est pas arrivée (ou si elle échoue), l'ensemble est vide : aucun
 *            badge, aucun tri. C'est un signe discret, jamais une erreur affichée.
 */
import { useEffect, useState } from 'react'
import { fetchOfficials } from './officials'

let shared: Promise<Set<string>> | null = null

export function useOfficials(): ReadonlySet<string> {
  const [officials, setOfficials] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false
    shared ??= fetchOfficials().catch(() => {
      shared = null // une lecture ratée se retente à la prochaine page
      return new Set<string>()
    })
    void shared.then((found) => {
      if (cancelled) return
      setOfficials(found)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return officials
}
