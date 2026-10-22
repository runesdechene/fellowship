/**
 * QUOI     — la coquille de tout écran connecté : barre latérale, barre du haut, contenu, mur d'affiche.
 * POURQUOI — elle porte le PageChromeProvider : la page (enfant) déclare son décor, la barre du
 *            haut et le mur (frères) le rendent. Elle garde aussi le repli de la barre latérale,
 *            mémorisé sur l'appareil.
 *            Elle lit les demandes d'ami et la pastille des Nouveautés une fois pour la barre
 *            latérale et la barre d'onglets.
 *            Une notification ouvre sa page au nom de son destinataire (`?compte=`) : la coquille
 *            active cette casquette, puis efface le paramètre (Uriel, 22/10/2026).
 * ATTENTION — `bare` retire la barre du haut : la création d'une date pose la sienne (lot 10b).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useNetwork } from '@/features/community/useNetwork'
import { useUpdatesUnread } from '@/features/updates/useUpdatesUnread'
import { useAuth } from '@/lib/auth'
import { ACCOUNT_PARAM } from '@/lib/notifications'
import { PageChromeProvider } from '@/lib/page-chrome'
import { supabase } from '@/lib/supabase'
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
  const { pathname, search, hash } = useLocation()
  const { person, actors, switchActor } = useAuth()
  const navigate = useNavigate()
  const friendRequests = useNetwork(pathname).network?.requests.length ?? 0
  const updatesUnread = useUpdatesUnread(pathname, person?.actor_id)

  // Une visite pour l'administration : à l'ouverture et à chaque retour sur l'onglet. La base ne
  // compte une nouvelle visite qu'après 30 minutes d'absence (noter_visite).
  useEffect(() => {
    // La requête ne part qu'attendue : un `void supabase.rpc(…)` seul n'envoie rien.
    const note = async () => {
      if (document.visibilityState === 'visible') await supabase.rpc('noter_visite')
    }
    const onVisible = () => void note()
    onVisible()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Attend que les casquettes soient connues ; une casquette qui n'est pas la sienne est ignorée.
  useEffect(() => {
    const params = new URLSearchParams(search)
    const account = params.get(ACCOUNT_PARAM)
    if (!account || actors.length === 0) return
    if (actors.some((candidate) => candidate.id === account)) switchActor(account)
    params.delete(ACCOUNT_PARAM)
    const rest = params.toString()
    void navigate({ pathname, search: rest ? `?${rest}` : '', hash }, { replace: true })
  }, [search, actors, switchActor, navigate, pathname, hash])

  // Le fournisseur enveloppe TOUT : la page qui déclare son décor est un
  // enfant, la barre du haut et le mur qui le rendent sont ses frères.
  return (
    <PageChromeProvider>
      <div className={collapsed ? 'app-shell app-shell--collapsed' : 'app-shell'}>
        <Sidebar
          collapsed={collapsed}
          onToggle={toggleSidebar}
          friendRequests={friendRequests}
          updatesUnread={updatesUnread}
        />
        <main className="app-shell__main">
          {!bare && <Topbar />}
          {children}
        </main>
        <PosterWall />
        <TabBar friendRequests={friendRequests} updatesUnread={updatesUnread} />
      </div>
    </PageChromeProvider>
  )
}
