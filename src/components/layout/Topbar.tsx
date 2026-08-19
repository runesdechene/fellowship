import { Bell, CirclePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTransitionNavigate } from '@/lib/navigation'
import { usePageChrome } from '@/lib/page-chrome'

/**
 * Barre du haut : cloche + « Ajouter une date », et à gauche l'accroche que
 * la page déclare — sur la fiche d'un événement, son compte à rebours. Les
 * écrans qui ne déclarent rien la laissent vide.
 */
export function Topbar() {
  const go = useTransitionNavigate()
  const { lead } = usePageChrome()

  return (
    <div className="topbar">
      {lead && <p className="topbar__lead">{lead}</p>}
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
