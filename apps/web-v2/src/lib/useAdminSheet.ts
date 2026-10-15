/**
 * QUOI     — charge la fiche d'un compte de l'administration (enseigne ou personne) à partir de son
 *            identifiant ; `reload` la relit après une correction.
 * POURQUOI — les deux fiches chargent de la même façon : seule la fonction `load` et le message
 *            « introuvable » changent.
 * ATTENTION — `load` doit être stable (fonction de module) : sinon l'effet se relance à chaque
 *            rendu. Tant que la fiche de l'adresse n'est pas chargée, la précédente ne s'affiche
 *            pas dessous.
 */
import { useCallback, useEffect, useState } from 'react'

export function useAdminSheet<T>(
  id: string,
  load: (id: string) => Promise<T | null>,
  notFound: string,
) {
  const [state, setState] = useState<{ id: string; data: T | null; error: string | null }>({
    id,
    data: null,
    error: null,
  })
  const [round, setRound] = useState(0)
  const reload = useCallback(() => setRound((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await load(id)
        if (cancelled) return
        setState({ id, data, error: data ? null : notFound })
      } catch (error) {
        if (cancelled) return
        setState({
          id,
          data: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [id, round, load, notFound])

  if (state.id !== id) return { data: null, error: null, reload }
  return { data: state.data, error: state.error, reload }
}
