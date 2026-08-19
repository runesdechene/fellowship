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
          {/* Pas le composant Button : ses variantes sont toutes des
              surfaces, et ceci est un chemin de retour, pas une commande. */}
          {back && (
            <button
              type="button"
              className="topbar__back"
              onClick={() => go(back)}
              aria-label="Retour"
              title="Retour"
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
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
