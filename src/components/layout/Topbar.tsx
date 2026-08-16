import { Bell, CirclePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Barre du haut : cloche + « Ajouter une date ». Rien d'autre sur la maquette. */
export function Topbar() {
  return (
    <div className="topbar">
      <Button variant="ghost" aria-label="Notifications">
        <Bell size={20} strokeWidth={1.75} />
      </Button>
      <Button icon={<CirclePlus size={22} strokeWidth={1.75} />}>Ajouter une date</Button>
    </div>
  )
}
