import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

/**
 * LE DÉCOR QU'UNE PAGE DEMANDE À LA COQUILLE.
 *
 * Trois morceaux de la fiche d'un événement vivent HORS du panneau : le mur
 * d'affiche, collé au bord droit de l'écran, et — dans la barre du haut — la
 * flèche de retour puis le compte à rebours. Aucun des trois ne peut être
 * rendu par la page, mais elle est la seule à savoir quoi y mettre.
 *
 * Elle le DÉCLARE, la coquille le rend. Une page qui ne déclare rien laisse
 * la coquille nue : c'est le cas de tous les autres écrans.
 */
export type PageChrome = {
  /** L'affiche qui remplit le mur de droite. `null` = pas de mur du tout. */
  poster: string | null
  /** Le mot posé à gauche de la barre du haut (« Dans 32 jours »). */
  lead: string | null
  /**
   * Où mène la flèche de retour, tout en haut à gauche. `null` = pas de
   * flèche — c'est le cas d'un écran qui n'a pas de parent.
   *
   * Un CHEMIN, pas une fonction : le décor est comparé champ à champ en
   * dépendances d'effet, et une fonction reconstruite à chaque rendu
   * relancerait la déclaration en boucle.
   */
  back: string | null
}

const NU: PageChrome = { poster: null, lead: null, back: null }

/**
 * DEUX contextes, pas un. Le lecteur change à chaque déclaration ; l'écrivain
 * ne change jamais. Les mélanger ferait boucler `useDeclarePageChrome` :
 * déclarer changerait la valeur du contexte, donc l'identité de la fonction,
 * donc relancerait l'effet qui déclare.
 */
const LectureContext = createContext<PageChrome>(NU)
const EcritureContext = createContext<(chrome: PageChrome) => void>(() => {})

export function PageChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChrome] = useState<PageChrome>(NU)

  return (
    <EcritureContext.Provider value={setChrome}>
      <LectureContext.Provider value={chrome}>{children}</LectureContext.Provider>
    </EcritureContext.Provider>
  )
}

/** Ce que la coquille doit afficher en ce moment. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePageChrome(): PageChrome {
  return useContext(LectureContext)
}

/**
 * Une page déclare son décor.
 *
 * Il se retire tout seul quand elle se démonte : sans ça, l'affiche d'un
 * événement resterait collée au bord de l'écran une fois revenu au tableau
 * de bord. Les champs sont passés à plat en dépendances pour qu'un objet
 * reconstruit à chaque rendu ne relance pas l'effet.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDeclarePageChrome({ poster, lead, back }: PageChrome): void {
  // Le poseur vient du contexte d’écriture, qui ne change JAMAIS : l’effet ne
  // se relance donc que si le décor lui-même a changé.
  const declarer = useContext(EcritureContext)

  useEffect(() => {
    declarer({ poster, lead, back })
    return () => declarer(NU)
  }, [declarer, poster, lead, back])
}
