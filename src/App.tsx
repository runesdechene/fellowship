import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/Landing'
import { LoginPage } from '@/pages/Login'
import { OnboardingPage } from '@/pages/Onboarding'
import { DashboardPage } from '@/pages/Dashboard'
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

function MaybeAuthenticatedProfile() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Chargement…
      </div>
    )
  }

  // Authenticated: show with layout
  if (user) {
    return (
      <AppLayout>
        <PublicProfilePage />
      </AppLayout>
    )
  }

  // Not authenticated: show without layout
  return <PublicProfilePage />
}

function App() {
  return (
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/@:slug" element={<MaybeAuthenticatedProfile />} />
          <Route path="/@:slug/embed" element={<EmbedPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Authenticated routes */}
          <Route path="/dashboard" element={<AuthenticatedApp><DashboardPage /></AuthenticatedApp>} />
          <Route path="/calendrier" element={<AuthenticatedApp><CalendarPage /></AuthenticatedApp>} />
          <Route path="/explorer" element={<AuthenticatedApp><ExplorerPage /></AuthenticatedApp>} />
          <Route path="/notifications" element={<AuthenticatedApp><NotificationsPage /></AuthenticatedApp>} />
          <Route path="/profil" element={<AuthenticatedApp><ProfilePage /></AuthenticatedApp>} />
          <Route path="/reglages" element={<AuthenticatedApp><SettingsPage /></AuthenticatedApp>} />
          <Route path="/suivis" element={<AuthenticatedApp><FollowingPage /></AuthenticatedApp>} />
          <Route path="/evenement/:id" element={<AuthenticatedApp><EventPage /></AuthenticatedApp>} />
        </Routes>
  )
}

export default App
