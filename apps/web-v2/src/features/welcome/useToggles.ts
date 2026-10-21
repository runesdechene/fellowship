/**
 * QUOI     — un ensemble de bascules (« Suivre », « Ça m'intéresse ») : le clic se voit tout de
 *            suite, l'écriture part, et revient en arrière si elle échoue.
 * POURQUOI — partagé par les deux étapes d'après la création. Une bascule reste inerte tant que son
 *            écriture n'est pas revenue : un double-clic rapide ne désaccorde plus l'écran et la base.
 */
import { useCallback, useState } from 'react'

export function useToggles(write: (id: string, on: boolean) => Promise<boolean>) {
  const [on, setOn] = useState<ReadonlySet<string>>(new Set())
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())

  const seed = useCallback((ids: readonly string[]) => {
    setOn(new Set(ids))
  }, [])

  function flip(set: typeof setOn, id: string, value: boolean) {
    set((current) => {
      const next = new Set(current)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function toggle(id: string) {
    if (pending.has(id)) return
    const value = !on.has(id)
    flip(setOn, id, value)
    flip(setPending, id, true)
    if (!(await write(id, value))) flip(setOn, id, !value)
    flip(setPending, id, false)
  }

  return { on, pending, seed, toggle }
}
