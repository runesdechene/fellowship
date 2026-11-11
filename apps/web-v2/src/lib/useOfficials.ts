/**
 * QUOI     — les comptes officiels, lus une fois par session et partagés.
 * POURQUOI — le badge paraît à côté de chaque nom : une liste à l'écran ne relit pas la base par nom.
 * ATTENTION — avant la toute première lecture (ou si elle échoue), l'ensemble est vide : aucun
 *            badge, aucun tri. C'est un signe discret, jamais une erreur affichée. Une fois lue, la
 *            liste sert dès le premier rendu des pages suivantes : rien ne clignote.
 */
import { useEffect, useState } from 'react'
import { fetchOfficials } from './officials'

let shared: Promise<Set<string>> | null = null
let known: ReadonlySet<string> | null = null

export function useOfficials(): ReadonlySet<string> {
  const [officials, setOfficials] = useState<ReadonlySet<string>>(() => known ?? new Set())

  useEffect(() => {
    if (known) return
    let cancelled = false
    shared ??= fetchOfficials().then(
      (found) => {
        known = found
        return found
      },
      () => {
        shared = null // une lecture ratée se retente à la prochaine page
        return new Set<string>()
      },
    )
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
