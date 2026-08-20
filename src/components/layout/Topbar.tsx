import { ArrowLeft, Bell, CirclePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTransitionNavigate } from '@/lib/navigation'
import { usePageChrome } from '@/lib/page-chrome'

/**
 * Barre du haut : cloche + « Ajouter une date » à droite, et à gauche les
 * deux repères que la page déclare — par où l'on sort, puis où l'on est. Sur
 * la fiche d'un événement : la flèche de retour, puis le compte à rebours.
 * Les écrans qui ne déclarent rien laissent le coin vide.
 *
 * La sortie est ICI, dans le coin, et pas en tête du contenu : c'est du
 * châssis, pas du texte. La main la cherche au même endroit sur tous les
 * écrans, et la page peut s'ouvrir sur son titre.
 */
export function Topbar() {
  const go = useTransitionNavigate()
  const { lead, back } = usePageChrome()

  return (
    <div className="topbar">
      {(back || lead) && (
        <div className="topbar__coin">
          {/* La MEME variante que la cloche, pas une imitation à côté. Le
              retour a d'abord été dessiné nu — « un chemin, pas une
              commande » — mais posé dans le châssis il est devenu le voisin
              direct de la cloche, et deux voisins identiques qui ne se
              ressemblent pas se remarquent. Uriel a tranché : les trois
              contrôles de la barre portent la même surface. */}
          {back && (
            <Button
              variant="icon"
              onClick={() => go(back)}
              aria-label="Retour"
              title="Retour"
            >
              <ArrowLeft size={20} strokeWidth={1.75} />
            </Button>
          )}
          {lead && <p className="topbar__lead">{lead}</p>}
        </div>
      )}
      <Button variant="icon" aria-label="Notifications">
        <Bell size={20} strokeWidth={1.75} />
      </Button>
      <Button
        icon={<CirclePlus size={22} strokeWidth={1.75} />}
        onClick={() => go('/evenement/nouveau')}
      >
        Ajouter une date
      </Button>
    </div>
  )
}
