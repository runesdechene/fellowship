/**
 * QUOI     — la navigation animée : changer d'écran ou d'étape via l'API View Transitions.
 * POURQUOI — c'est la seule façon d'animer aussi la SORTIE d'un écran ; sans elle, l'ancien
 *            contenu disparaît d'un coup.
 * ATTENTION — flushSync est indispensable, et une transition ne se vérifie pas dans un onglet en
 *            arrière-plan (.claude/rules/v2.md).
 */
import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

/**
 * Anime un changement d'écran ou d'étape.
 *
 * Le navigateur photographie la page avant et après la mise à jour, puis fait
 * coexister les deux images le temps de l'animation. C'est la seule façon
 * d'animer aussi la SORTIE : sans ça, React retire l'ancien contenu d'un coup
 * et il disparaît en clignotant.
 *
 * `flushSync` est indispensable : sans lui React appliquerait le changement
 * plus tard et le navigateur photographierait deux fois la même chose.
 *
 * Le `mode` est posé sur la racine du document le temps du passage, pour que
 * le CSS sache quelle animation jouer — aller, retour, ou changement d'écran.
 */
// Le numéro de la dernière transition lancée : seule elle peut effacer le mode de la racine.
let latest = 0

export function useViewTransition() {
  return useCallback((mode: string, update: () => void) => {
    const doc = document as DocumentWithViewTransition
    if (typeof doc.startViewTransition !== 'function') {
      update()
      return
    }

    const root = document.documentElement
    root.dataset.transition = mode
    const id = ++latest

    // Une transition qui finit après le départ de la suivante ne doit pas effacer le mode de
    // celle-ci : fermer Messages avant la fin de son ouverture perdait son animation.
    const forget = () => {
      if (id === latest) delete root.dataset.transition
    }
    // `finished` est rejetée si la transition est interrompue : on nettoie
    // dans les deux cas, sinon l'attribut resterait collé à la racine.
    doc.startViewTransition(() => flushSync(update)).finished.then(forget, forget)
  }, [])
}

/** Navigation animée entre deux écrans ; `mode` choisit l'animation (page-transition.css). */
export function useTransitionNavigate(mode = 'page') {
  const navigate = useNavigate()
  const transition = useViewTransition()

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      transition(mode, () => {
        void navigate(to, options)
      })
    },
    [mode, navigate, transition],
  )
}
