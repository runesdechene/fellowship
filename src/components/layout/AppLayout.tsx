import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'
import { EventForm } from '@/components/events/EventForm'
import { Plus, X } from 'lucide-react'

export function AppLayout({ children }: { children: ReactNode }) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomBar />

      {/* FAB — global */}
      <button
        onClick={() => setShowCreate(true)}
        className="fab-button"
      >
        <Plus className="h-6 w-6" strokeWidth={2} />
      </button>

      {/* Create event modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowCreate(false)}
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
