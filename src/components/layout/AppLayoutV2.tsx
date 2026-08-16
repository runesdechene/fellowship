import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { SidebarV2 } from './SidebarV2'
import { TopbarV2 } from './TopbarV2'
import { BottomBarV2 } from './BottomBarV2'
import { EventForm } from '@/components/events/EventForm'
import { useAuth } from '@/lib/auth'
import { isRouteValidFor } from '@/lib/navModel'
import '@/styles/app2.css'
import './AppLayoutV2.css'

export function AppLayoutV2({ children }: { children: ReactNode }) {
  const [showCreate, setShowCreate] = useState(false)
  const { currentActor } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Garde de route reprise telle quelle de AppLayout : un acteur qui n'a pas
  // accès à la route courante est renvoyé sur l'Explorer.
  useEffect(() => {
    if (currentActor && !isRouteValidFor(location.pathname, currentActor)) {
      navigate('/explorer', { replace: true })
    }
  }, [currentActor, location.pathname, navigate])

  return (
    <div className="app2">
      <div className="app2-halos" aria-hidden="true">
        <i className="app2-h1" /><i className="app2-h2" /><i className="app2-h3" /><i className="app2-h4" />
      </div>
      <SidebarV2 />
      {/* Coins inversés : deux blocs couleur parchemin, posés à la jonction du
          rail et du contenu, avec un rayon creusé vers l'intérieur. C'est eux
          qui dessinent la courbe — pas un border-radius sur le panneau, qui ne
          se lisait pas faute de contraste. */}
      <i className="app2-corner app2-corner-tl" aria-hidden="true" />
      <i className="app2-corner app2-corner-bl" aria-hidden="true" />
      <div className="app2-stage">
        <TopbarV2 onCreateEvent={() => setShowCreate(true)} />
        <main className="app2-main">{children}</main>
      </div>
      <BottomBarV2 />

      {showCreate && (
        <div className="app2-modal-scrim">
          <div className="app2-modal" onClick={e => e.stopPropagation()}>
            <div className="app2-modal-head">
              <h2>Nouvel événement</h2>
              <button onClick={() => setShowCreate(false)} aria-label="Fermer"><X strokeWidth={2} /></button>
            </div>
            <EventForm onClose={() => setShowCreate(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
