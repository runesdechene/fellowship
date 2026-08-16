import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, type To } from 'react-router-dom'

/**
 * Le navigateur ne sait animer un changement d'écran que s'il photographie
 * la page AVANT et APRÈS la mise à jour. D'où `flushSync` : sans lui, React
 * appliquerait le changement plus tard et le navigateur photographierait
 * deux fois la même chose.
 */
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

/**
 * Navigation animée.
 *
 * L'option `viewTransition` de React Router n'est branchée que dans le
 * routeur de données (`RouterProvider`) ; avec `<BrowserRouter>` elle est
 * ignorée sans rien dire. On déclenche donc la transition nous-mêmes.
 *
 * Un navigateur qui ne connaît pas les transitions de vue change d'écran
 * normalement : l'animation est un supplément, jamais une condition.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate()

  return useCallback(
    (to: To) => {
      const doc = document as DocumentWithViewTransition
      if (typeof doc.startViewTransition !== 'function') {
        navigate(to)
        return
      }
      doc.startViewTransition(() => {
        flushSync(() => {
          navigate(to)
        })
      })
    },
    [navigate],
  )
}
