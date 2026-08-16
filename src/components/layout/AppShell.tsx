import { useCallback, useEffect, useState, type ReactNode } from 'react'
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

  return (
    <div className={collapsed ? 'app-shell app-shell--collapsed' : 'app-shell'}>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className="app-shell__main">
        <Topbar />
        {children}
      </main>
    </div>
  )
}
