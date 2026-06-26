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
import { CommunautePage } from '@/pages/Communaute'
import { BoutiquePage } from '@/pages/Boutique'
import { AbonnementPage } from '@/pages/Abonnement'
import { CockpitPage } from '@/pages/Cockpit'
import { MentionsLegalesPage } from '@/pages/legal/MentionsLegales'
import { ConfidentialitePage } from '@/pages/legal/Confidentialite'
import { CGUPage } from '@/pages/legal/CGU'
import { CGVPage } from '@/pages/legal/CGV'
import { ChartePage } from '@/pages/legal/Charte'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { AdminRoute } from '@/components/admin/AdminRoute'
import { ComingSoon } from '@/components/layout/ComingSoon'
import { ProGate } from '@/components/layout/ProGate'

const AdminLayout = lazy(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminEvents = lazy(() => import('@/components/admin/AdminEvents').then(m => ({ default: m.AdminEvents })))
const AdminUsers = lazy(() => import('@/components/admin/AdminUsers').then(m => ({ default: m.AdminUsers })))
const AdminTags = lazy(() => import('@/components/admin/AdminTags').then(m => ({ default: m.AdminTags })))
const AdminTestimonials = lazy(() => import('@/components/admin/AdminTestimonials').then(m => ({ default: m.AdminTestimonials })))
const AdminReports = lazy(() => import('@/components/admin/AdminReports').then(m => ({ default: m.AdminReports })))
// Carte = lazy : MapLibre (~200 kB) ne charge que sur /carte.
const Carte = lazy(() => import('@/pages/Carte'))

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

// Page événement PUBLIQUE (lien partagé / embed / calendrier d'un site tiers).
// Connecté → dans le shell de l'app ; anonyme → page nue (comme la vitrine).
// La RLS autorise déjà la lecture anonyme des events + participations publiques ;
// EventPage garde toutes ses actions derrière `currentActor`/`user`.
function EventWithLayout() {
  const { user } = useAuth()
  if (user) {
    return (
      <AppLayout>
        <EventPage />
      </AppLayout>
    )
  }
  return <EventPage />
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
          <Route path="/carte" element={<AuthenticatedApp><Suspense fallback={<div className="absolute inset-0" />}><Carte /></Suspense></AuthenticatedApp>} />
          <Route path="/explorer" element={<AuthenticatedApp><ExplorerPage /></AuthenticatedApp>} />
          <Route path="/notifications" element={<AuthenticatedApp><NotificationsPage /></AuthenticatedApp>} />
          <Route path="/profil" element={<AuthenticatedApp><ProfilePage /></AuthenticatedApp>} />
          <Route path="/reglages" element={<AuthenticatedApp><SettingsPage /></AuthenticatedApp>} />
          <Route path="/suivis" element={<AuthenticatedApp><FollowingPage /></AuthenticatedApp>} />
          <Route path="/mes-dates" element={<Navigate to="/calendrier" replace />} />
          <Route path="/mes-createurs" element={<AuthenticatedApp><ComingSoon title="Mes créateurs" /></AuthenticatedApp>} />
          <Route path="/communaute" element={<AuthenticatedApp><CommunautePage /></AuthenticatedApp>} />
          <Route path="/tableau-de-bord" element={<AuthenticatedApp><ProGate title="Cockpit"><CockpitPage /></ProGate></AuthenticatedApp>} />
          <Route path="/boutique" element={<AuthenticatedApp><BoutiquePage /></AuthenticatedApp>} />
          <Route path="/abonnement" element={<AuthenticatedApp><AbonnementPage /></AuthenticatedApp>} />
          <Route path="/evenement/:id" element={<EventWithLayout />} />
          <Route path="/e/:slug" element={<EventWithLayout />} />

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
            <Route path="testimonials" element={<Suspense fallback={<AdminFallback />}><AdminTestimonials /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<AdminFallback />}><AdminReports /></Suspense>} />
          </Route>

          {/* Pages légales — publiques, hors AuthenticatedApp */}
          <Route path="/legal/mentions-legales" element={<MentionsLegalesPage />} />
          <Route path="/legal/confidentialite" element={<ConfidentialitePage />} />
          <Route path="/legal/cgu" element={<CGUPage />} />
          <Route path="/legal/cgv" element={<CGVPage />} />
          <Route path="/legal/charte-communautaire" element={<ChartePage />} />

          {/* Profile — with layout if authenticated, without if not */}
          <Route path="/:slug" element={<ProfileWithLayout />} />
          <Route path="/:slug/embed" element={<EmbedPage />} />
        </Routes>
    </>
  )
}

export default App
