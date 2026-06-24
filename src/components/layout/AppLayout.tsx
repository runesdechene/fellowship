import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'
import { SearchBar } from './SearchBar'
import { FloatingActions } from './FloatingActions'
import { ChangelogModal } from './ChangelogModal'
import { EventForm } from '@/components/events/EventForm'
import { useAuth } from '@/lib/auth'
import { isRouteValidFor, isPublicProfilePath } from '@/lib/navModel'
import { X } from 'lucide-react'

export function AppLayout({ children }: { children: ReactNode }) {
  const [showCreate, setShowCreate] = useState(false)
  const { currentActor } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  // L'Explorer (coverflow) est immersif plein écran : pas de SearchBar + main sans scroll.
  const isExplorer = location.pathname === '/explorer'
  // La Carte est immersive plein écran (comme l'Explorer) : pas de SearchBar, pas de scroll.
  const isCarte = location.pathname === '/carte'
  // Cockpit : la zone scrollable porte le fond DA (--app-bg, fixé) pour que la navbar
  // et la page partagent UN SEUL fond continu (sinon la navbar fait une bande visible).
  const isDashboard = location.pathname === '/tableau-de-bord'
  // Le Calendrier partage le même traitement que le Cockpit : fond DA continu
  // (--app-bg fixé) sur la zone scrollable + bande de navbar masquée, sinon la
  // navbar (page-backdrop brun) tranche sur le fond gris de la page.
  const isCalendar = location.pathname === '/calendrier'
  // La vitrine publique (/:slug) commence par une cover plein-bord en haut du stage :
  // pas de SearchBar globale (sinon la cover démarre sous la navbar et le scroll ne prend
  // pas toute la hauteur). Mais elle scrolle normalement (contrairement à l'Explorer).
  const isVitrine = isPublicProfilePath(location.pathname)
  const hideSearchBar = isExplorer || isVitrine || isCarte
  // L'Explorer scrolle au niveau page (mode grille = liste longue ; le slideshow reste
  // calé à 100% via `.explorer { height:100%; overflow:hidden }`, donc pas de scroll).
  // Seule la Carte reste vraiment sans scroll (carte plein écran).
  const noScroll = isCarte
  useEffect(() => {
    if (currentActor && !isRouteValidFor(location.pathname, currentActor)) {
      navigate('/explorer', { replace: true })
    }
  }, [currentActor, location.pathname, navigate])

  return (
    <div className="flex h-screen">
      <Sidebar />
      {/* Padding bas = hauteur réelle de la BottomBar (~70px) + safe-area iPhone, sinon la nav fixe
          recouvre la dernière section et le scroll ne peut pas la révéler (#5 : contact Réglages). */}
      <div className={`flex-1 flex flex-col ${noScroll ? 'overflow-hidden' : 'overflow-y-auto'} ${isDashboard || isCalendar ? 'cockpit-stage' : ''} pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0`}>
        {!hideSearchBar && <SearchBar onCreateEvent={() => setShowCreate(true)} />}
        <main className={`flex-1 min-h-0 ${isCarte ? 'flex flex-col' : ''}`}>
          {children}
        </main>
      </div>
      <BottomBar />

      {/* Sur les pages immersives la SearchBar est masquée : on garde quand même
          le flotteur « + Ajouter / 🔔 » disponible partout (desktop). */}
      {hideSearchBar && <FloatingActions onCreateEvent={() => setShowCreate(true)} />}

      <ChangelogModal />

      {/* Create event modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-card p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold">Nouvel événement</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <EventForm onClose={() => setShowCreate(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
