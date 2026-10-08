/**
 * QUOI     — les routes de la V2 et leur garde : connexion, tableau de bord, calendrier, création,
 *            fiche, avis, explorer, bilans, offre Pro, vitrine.
 * POURQUOI — chaque écran a une adresse ; la garde (useV2Access) n'ouvre la V2 qu'aux admins et
 *            renvoie les autres sur la V1.
 */
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { CreateEvent } from '@/features/event-create/CreateEvent'
import { EventPage } from '@/features/event/EventPage'
import { ExplorerPage } from '@/features/explorer/ExplorerPage'
import { ProPage } from '@/features/pro/ProPage'
import { ReportPage } from '@/features/reports/ReportPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { WriteReviewPage } from '@/features/review/WriteReviewPage'
import { VitrinePage } from '@/features/vitrine/VitrinePage'
import { Login } from '@/pages/Login'
import { useAuth } from '@/lib/auth'
import { useV2Access } from '@/lib/useV2Access'
import { useEffect, type ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const decision = useV2Access()
  if (decision === 'wait') return null
  if (decision === 'login') return <Navigate to="/connexion" replace />
  if (decision === 'leave') return <LeaveToV1 />
  return <>{children}</>
}

// Hors du routeur de la V2 (basename /v2) : la V1 vit à la racine du domaine.
function LeaveToV1() {
  useEffect(() => {
    window.location.replace('/')
  }, [])
  return null
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
      <Route
        path="/evenement/:id/avis"
        element={
          <ProtectedRoute>
            <AppShell>
              <WriteReviewPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/explorer"
        element={
          <ProtectedRoute>
            <AppShell>
              <ExplorerPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendrier"
        element={
          <ProtectedRoute>
            <AppShell>
              <CalendarPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bilans"
        element={
          <ProtectedRoute>
            <AppShell>
              <ReportsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bilans/:eventId"
        element={
          <ProtectedRoute>
            <AppShell>
              <ReportPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pro"
        element={
          <ProtectedRoute>
            <AppShell>
              <ProPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      {/* Une vitrine à la racine, comme dans la V1 : les adresses fixes au-dessus l'emportent. */}
      <Route
        path="/:slug"
        element={
          <ProtectedRoute>
            <AppShell>
              <VitrinePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
