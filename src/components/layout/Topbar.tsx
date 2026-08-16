import { Bell, CirclePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTransitionNavigate } from '@/lib/navigation'

/** Barre du haut : cloche + « Ajouter une date ». Rien d'autre sur la maquette. */
export function Topbar() {
  const go = useTransitionNavigate()

  return (
    <div className="topbar">
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
