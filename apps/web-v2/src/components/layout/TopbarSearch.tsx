/**
 * QUOI     — la loupe de la barre du haut : elle ouvre la recherche plein écran
 *            (features/search/SearchOverlay), sur tous les écrans, Explorer compris (Uriel, 01/11/2026).
 * POURQUOI — maquette 2606:233 (Uriel, 01/11/2026) : une loupe du même dessin que la cloche, plutôt
 *            qu'un champ toujours là.
 * ATTENTION — l'ouverture est une entrée d'historique (`?recherche`, `state.search`) : le retour du
 *            navigateur referme la recherche.
 */
import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SEARCH_PARAM } from '@/features/search/SearchOverlay'

export function TopbarSearch() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  return (
    <Button
      variant="icon"
      aria-label="Rechercher"
      title="Rechercher"
      onClick={() => {
        const next = new URLSearchParams(params)
        next.set(SEARCH_PARAM, '')
        void navigate({ search: next.toString() }, { state: { search: true } })
      }}
    >
      <Search size={20} strokeWidth={1.75} />
    </Button>
  )
}
