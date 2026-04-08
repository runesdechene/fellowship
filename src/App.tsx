import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/Landing'
import { LoginPage } from '@/pages/Login'
import { OnboardingPage } from '@/pages/Onboarding'
import { ExplorerPage } from '@/pages/Explorer'
import { NotificationsPage } from '@/pages/Notifications'
import { ProfilePage } from '@/pages/Profile'
import { SettingsPage } from '@/pages/Settings'
import { FollowingPage } from '@/pages/Following'
import { EventPage } from '@/pages/EventPage'
import { PublicProfilePage } from '@/pages/PublicProfile'
import { EmbedPage } from '@/pages/Embed'
import { AuthCallbackPage } from '@/pages/AuthCallback'
import { CalendarPage } from '@/pages/Calendar'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { AdminRoute } from '@/components/admin/AdminRoute'

const AdminLayout = lazy(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminEvents = lazy(() => import('@/components/admin/AdminEvents').then(m => ({ default: m.AdminEvents })))
const AdminUsers = lazy(() => import('@/components/admin/AdminUsers').then(m => ({ default: m.AdminUsers })))
const AdminTags = lazy(() => import('@/components/admin/AdminTags').then(m => ({ default: m.AdminTags })))
const AdminReports = lazy(() => import('@/components/admin/AdminReports').then(m => ({ default: m.AdminReports })))

function AdminFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { needsOnboarding } = useAuth()
  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <AppLayout>{children}</AppLayout>
      </OnboardingGuard>
    </ProtectedRoute>
  )
}

function ProfileWithLayout() {
  const { user } = useAuth()
  if (user) {
    return (
      <AppLayout>
        <PublicProfilePage />
      </AppLayout>
    )
  }
  return <PublicProfilePage />
}

function App() {
  return (
    <>
        <InstallPrompt />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Authenticated routes */}
          <Route path="/dashboard" element={<Navigate to="/explorer" replace />} />
          <Route path="/calendrier" element={<AuthenticatedApp><CalendarPage /></AuthenticatedApp>} />
          <Route path="/explorer" element={<AuthenticatedApp><ExplorerPage /></AuthenticatedApp>} />
          <Route path="/notifications" element={<AuthenticatedApp><NotificationsPage /></AuthenticatedApp>} />
          <Route path="/profil" element={<AuthenticatedApp><ProfilePage /></AuthenticatedApp>} />
          <Route path="/reglages" element={<AuthenticatedApp><SettingsPage /></AuthenticatedApp>} />
          <Route path="/suivis" element={<AuthenticatedApp><FollowingPage /></AuthenticatedApp>} />
          <Route path="/evenement/:id" element={<AuthenticatedApp><EventPage /></AuthenticatedApp>} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AppLayout>
                  <Suspense fallback={<AdminFallback />}>
                    <AdminLayout />
                  </Suspense>
                </AppLayout>
              </AdminRoute>
            }
          >
            <Route index element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>} />
            <Route path="events" element={<Suspense fallback={<AdminFallback />}><AdminEvents /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<AdminFallback />}><AdminUsers /></Suspense>} />
            <Route path="tags" element={<Suspense fallback={<AdminFallback />}><AdminTags /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<AdminFallback />}><AdminReports /></Suspense>} />
          </Route>

          {/* Profile — with layout if authenticated, without if not */}
          <Route path="/:slug" element={<ProfileWithLayout />} />
          <Route path="/:slug/embed" element={<EmbedPage />} />
        </Routes>
    </>
  )
}

export default App
