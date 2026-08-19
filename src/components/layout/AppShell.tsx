import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PageChromeProvider, usePageChrome } from '@/lib/page-chrome'
import { PosterWall } from './PosterWall'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const COLLAPSED_KEY = 'flwsh-sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell({ children }: { children: ReactNode }) {
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

  // Le fournisseur enveloppe TOUT : la page qui déclare son décor est un
  // enfant, la barre du haut et le mur qui le rendent sont ses frères.
  return (
    <PageChromeProvider>
      <Coque collapsed={collapsed} onToggle={toggleSidebar}>
        {children}
      </Coque>
    </PageChromeProvider>
  )
}

/**
 * La coque ne peut pas vivre dans AppShell : elle LIT le décor que le
 * fournisseur porte, or on ne lit pas un contexte depuis le composant qui le
 * pose. D'où ce petit intérieur.
 *
 * Il existe pour une seule raison : la coque doit SAVOIR qu'il y a un mur.
 * Le CSS pourrait le déduire avec un sélecteur parent, mais ce sélecteur
 * fait surveiller au moteur de style tout le sous-arbre de l'app à chaque
 * mutation, pour une information que React a déjà sous la main.
 */
function Coque({
  collapsed,
  onToggle,
  children,
}: {
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const { poster } = usePageChrome()

  const classes = ['app-shell']
  if (collapsed) classes.push('app-shell--collapsed')
  if (poster) classes.push('app-shell--mur')

  return (
    <div className={classes.join(' ')}>
      <Sidebar collapsed={collapsed} onToggle={onToggle} />
      <main className="app-shell__main">
        <Topbar />
        {children}
      </main>
      <PosterWall />
    </div>
  )
}
