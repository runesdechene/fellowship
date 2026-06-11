import { Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { NotifBell } from './NotifBell'
import { DebugPlanSwitch } from './DebugPlanSwitch'
import './FloatingActions.css'

/** Pill flottante haut-droite « + Ajouter / 🔔 » pour les pages immersives qui
 *  masquent la SearchBar globale (Explorer, Carte, vitrine). Sur les autres
 *  pages, ce cluster vit dans la SearchBar — ici on le rend disponible partout.
 *  Réutilise les classes globales (.search-bar-add-btn, .notif-bell-*) ; seule
 *  la position du conteneur (.floating-actions) est propre à ce composant. */
export function FloatingActions({ onCreateEvent }: { onCreateEvent?: () => void }) {
  const { currentActor } = useAuth()
  if (!currentActor) return null

  return (
    <div className="floating-actions">
      {onCreateEvent && (
        <button
          className="search-bar-add-btn search-bar-add-desktop"
          onClick={onCreateEvent}
          title="Ajouter un événement"
        >
          <Plus strokeWidth={2} />
          <span className="search-bar-add-label">Ajouter un événement</span>
        </button>
      )}
      <DebugPlanSwitch />
      <NotifBell />
    </div>
  )
}
