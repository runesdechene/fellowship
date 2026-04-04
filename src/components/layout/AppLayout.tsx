import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomBar />
    </div>
  )
}
