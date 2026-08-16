import { Bell, CirclePlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

/** Barre du haut : cloche + « Ajouter une date ». Rien d'autre sur la maquette. */
export function Topbar() {
  const navigate = useNavigate()

  return (
    <div className="topbar">
      <Button variant="icon" aria-label="Notifications">
        <Bell size={20} strokeWidth={1.75} />
      </Button>
      <Button
        icon={<CirclePlus size={22} strokeWidth={1.75} />}
        onClick={() => navigate('/evenement/nouveau', { viewTransition: true })}
      >
        Ajouter une date
      </Button>
    </div>
  )
}
