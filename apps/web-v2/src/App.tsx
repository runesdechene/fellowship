import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { CreateEvent } from '@/features/event-create/CreateEvent'
import { EventPage } from '@/features/event/EventPage'
import { Login } from '@/pages/Login'
import { useAuth } from '@/lib/auth'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/connexion" replace />
  return <>{children}</>
}

export function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/connexion"
        element={loading ? null : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evenement/nouveau"
        element={
          <ProtectedRoute>
            <AppShell>
              <CreateEvent />
            </AppShell>
          </ProtectedRoute>
        }
      />
      {/* « /evenement/nouveau » l'emporte sur ce motif : le routeur classe les
          segments fixes avant les variables, quel que soit l'ordre écrit ici. */}
      <Route
        path="/evenement/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <EventPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
