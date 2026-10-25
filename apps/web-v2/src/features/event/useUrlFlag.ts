/**
 * QUOI     — un panneau de la fiche ouvert par son adresse (`?carte`, `?candidater`) : savoir s'il
 *            est ouvert, l'ouvrir, le fermer.
 * POURQUOI — tout état navigable est une URL : le retour du navigateur referme le panneau sans
 *            quitter la fiche.
 * ATTENTION — fermer revient en arrière seulement si c'est la fiche qui a ouvert le panneau ;
 *            arrivé directement sur l'adresse, on retire le paramètre sans quitter la page.
 */
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export function useUrlFlag(name: string) {
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const isOpen = search.has(name)

  const open = () => {
    if (isOpen) return
    setSearch(
      (current) => {
        current.set(name, '')
        return current
      },
      { state: { openedFlag: name } },
    )
  }

  const close = () => {
    if ((location.state as { openedFlag?: string } | null)?.openedFlag === name) void navigate(-1)
    else
      setSearch(
        (current) => {
          current.delete(name)
          return current
        },
        { replace: true },
      )
  }

  return { isOpen, open, close }
}
