/**
 * QUOI     — la coquille de tout écran connecté : barre latérale, barre du haut, contenu, mur d'affiche.
 * POURQUOI — elle porte le PageChromeProvider : la page (enfant) déclare son décor, la barre du
 *            haut et le mur (frères) le rendent. Elle garde aussi le repli de la barre latérale,
 *            mémorisé sur l'appareil.
 *            Elle lit les demandes d'ami une fois pour la barre latérale et la barre d'onglets.
 * ATTENTION — `bare` retire la barre du haut : la création d'une date pose la sienne (lot 10b).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useNetwork } from '@/features/community/useNetwork'
import { PageChromeProvider } from '@/lib/page-chrome'
import { PosterWall } from './PosterWall'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { Topbar } from './Topbar'

const COLLAPSED_KEY = 'flwsh-sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  // Le repli survit au rechargement : c'est un réglage, pas un état de passage.
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      /* stockage indisponible : le réglage vaut pour cette session seulement */
    }
  }, [collapsed])

  const toggleSidebar = useCallback(() => setCollapsed((previous) => !previous), [])
  // Les demandes d'ami, pour la pastille de Communauté : relues à chaque changement d'adresse.
  const friendRequests = useNetwork(useLocation().pathname).network?.requests.length ?? 0

  // Le fournisseur enveloppe TOUT : la page qui déclare son décor est un
  // enfant, la barre du haut et le mur qui le rendent sont ses frères.
  return (
    <PageChromeProvider>
      <div className={collapsed ? 'app-shell app-shell--collapsed' : 'app-shell'}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} friendRequests={friendRequests} />
        <main className="app-shell__main">
          {!bare && <Topbar />}
          {children}
        </main>
        <PosterWall />
        <TabBar friendRequests={friendRequests} />
      </div>
    </PageChromeProvider>
  )
}
