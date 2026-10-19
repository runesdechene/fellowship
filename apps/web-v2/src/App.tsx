/**
 * QUOI     — les routes de la V2 et leurs gardes : landing (sans compte sur `/`, pour tous sur
 *            `/decouvrir`), recherche publique (`/festivals`), connexion, arrivée, tableau de
 *            bord, calendrier, création, fiche (ouverte sans compte), avis, explorer, bilans,
 *            offre Pro, réglages, vitrine, administration (admins seulement, `/admin`).
 * POURQUOI — chaque écran a une adresse ; tout compte connecté entre depuis la bascule (lot 12) ;
 *            un compte sans prénom passe d'abord par l'arrivée (lot 10a).
 */
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { IdentityError } from '@/components/layout/IdentityError'
import { UpdateBanner } from '@/components/layout/UpdateBanner'
import { GuestShell } from '@/components/layout/GuestShell'
import { AccountsPage } from '@/features/admin-accounts/AccountsPage'
import { ProspectPage } from '@/features/admin-prospects/ProspectPage'
import { ProspectsPage } from '@/features/admin-prospects/ProspectsPage'
import { TemplatesPage } from '@/features/admin-prospects/TemplatesPage'
import { UnclassifiedPage } from '@/features/admin-prospects/UnclassifiedPage'
import { EntityPage } from '@/features/admin-entity/EntityPage'
import { PersonPage } from '@/features/admin-person/PersonPage'
import { ModerationPage } from '@/features/admin-moderation/ModerationPage'
import { AdminEventsPage } from '@/features/admin-events/AdminEventsPage'
import { CategoriesPage } from '@/features/admin-categories/CategoriesPage'
import { TestimonialsPage } from '@/features/admin-testimonials/TestimonialsPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { CreateEvent } from '@/features/event-create/CreateEvent'
import { EditEvent } from '@/features/event-edit/EditEvent'
import { HistoryPage } from '@/features/event-history/HistoryPage'
import { VersionPage } from '@/features/event-history/VersionPage'
import { EventPage } from '@/features/event/EventPage'
import { EventSlugRedirect } from '@/features/event/EventSlugRedirect'
import { EmbedPage } from '@/features/embed/EmbedPage'
import { ExplorerPage } from '@/features/explorer/ExplorerPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { PublicSearchPage } from '@/features/public-search/PublicSearchPage'
import { ProPage } from '@/features/pro/ProPage'
import { ReportPage } from '@/features/reports/ReportPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { WriteReviewPage } from '@/features/review/WriteReviewPage'
import { VitrineRoute } from '@/features/vitrine/VitrineRoute'
import { WelcomePage } from '@/features/welcome/WelcomePage'
import { Login } from '@/pages/Login'
import { LegalRoute } from '@/pages/legal/LegalRoute'
import { Unsubscribe } from '@/pages/Unsubscribe'
import { useAuth } from '@/lib/auth'
import { loginReturning, safeReturn } from '@/lib/welcome'
import { welcomeKind } from '@/lib/welcome-guard'
import { type ReactNode } from 'react'

/** La garde d'accès seule : une session ouverte entre. `guest` remplace la connexion pour un
 *  visiteur sans compte (la landing, sur `/`). */
function AccessRoute({ children, guest }: { children: ReactNode; guest?: ReactNode }) {
  const { user, loading, identityFailed } = useAuth()
  const { pathname, search } = useLocation()
  if (loading) return null
  // Un favori ou un lien d'e-mail ouvert sans session y revient après la connexion (lot 12).
  if (!user) return guest ?? <Navigate to={loginReturning(pathname + search)} replace />
  if (identityFailed) return <IdentityError />
  return <>{children}</>
}

/** Un compte sans prénom passe d'abord par l'arrivée, puis revient où il allait (lot 10a). */
function WelcomeGate({ children }: { children: ReactNode }) {
  const { person, entities } = useAuth()
  const location = useLocation()
  const kind = welcomeKind(person, entities.length, null)
  if (kind) {
    const back = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/bienvenue?retour=${back}`} replace />
  }
  return <>{children}</>
}

function ProtectedRoute({ children, guest }: { children: ReactNode; guest?: ReactNode }) {
  return (
    <AccessRoute guest={guest}>
      <WelcomeGate>{children}</WelcomeGate>
    </AccessRoute>
  )
}

/** Une page ouverte sans compte (fiche, vitrine) : le cadre de la landing pour un visiteur, celui
 *  de l'app pour un compte. */
function OpenRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute guest={<GuestShell>{children}</GuestShell>}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}

/** L'administration : les admins seulement. Elle ne protège que l'affichage — chaque fonction
 *  admin_* refuse en base tout appel qui ne vient pas d'un admin. */
function AdminRoute({ children }: { children: ReactNode }) {
  const { person } = useAuth()
  if (!person) return null
  if (person.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminRoute>
        <AppShell bare>
          <div className="admin-content">{children}</div>
        </AppShell>
      </AdminRoute>
    </ProtectedRoute>
  )
}

/** `/bienvenue` : l'arrivée à faire, ou le tableau de bord s'il n'y en a aucune. */
function WelcomeRoute() {
  const { person, entities } = useAuth()
  const [search] = useSearchParams()
  if (!person) return null
  const kind = welcomeKind(
    person,
    entities.length,
    search.has('nouvelle-enseigne') ? 'nouvelle-enseigne' : null,
  )
  // L'arrivée finie (le prénom vient d'être relu), on rejoint l'adresse demandée au départ.
  return kind ? (
    <WelcomePage kind={kind} />
  ) : (
    <Navigate to={safeReturn(search.get('retour')) ?? '/'} replace />
  )
}

/** `/connexion` : une session ouverte repart où on l'attendait (`?retour`, lot 11b), sinon à
 *  l'accueil ; un compte neuf passe d'abord par l'arrivée, qui l'y ramène ensuite. */
function LoginRoute() {
  const { user, loading } = useAuth()
  const [search] = useSearchParams()
  if (loading) return null
  if (user) return <Navigate to={safeReturn(search.get('retour')) ?? '/'} replace />
  return <Login />
}

/** `/festivals` : la recherche publique pour un visiteur ; un compte connecté retrouve sa
 *  recherche dans l'Explorer (6 mois en gratuit, toute l'année en Pro). */
function PublicSearchRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (user) return <Navigate to={`/explorer${location.search}`} replace />
  return <PublicSearchPage />
}

export function App() {
  const { pathname } = useLocation()
  return (
    <>
      {/* Partout sauf dans le calendrier intégré, qui vit chez un artiste (lot 12). */}
      {!pathname.endsWith('/embed') && <UpdateBanner />}
      <Routes>
        {/* La landing pour tout le monde, connecté ou non : pour la relire sans se déconnecter. */}
        <Route path="/decouvrir" element={<LandingPage />} />
        <Route path="/festivals" element={<PublicSearchRoute />} />
        <Route path="/desinscription" element={<Unsubscribe />} />
        <Route path="/connexion" element={<LoginRoute />} />
        <Route path="/legal/:doc" element={<LegalRoute />} />
        {/* Le calendrier intégré chez un artiste : ni coque, ni session (lot 12). */}
        <Route path="/:slug/embed" element={<EmbedPage />} />
        {/* L'ancien lien partagé d'un événement (V1) : il cherche la fiche par son slug (lot 12). */}
        <Route
          path="/e/:slug"
          element={
            <OpenRoute>
              <EventSlugRedirect />
            </OpenRoute>
          }
        />
        <Route
          path="/bienvenue"
          element={
            <AccessRoute>
              <WelcomeRoute />
            </AccessRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute guest={<LandingPage />}>
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
              <AppShell bare>
                <CreateEvent />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/evenement/:id/modifier"
          element={
            <ProtectedRoute>
              <AppShell bare>
                <EditEvent />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/evenement/:id/historique"
          element={
            <ProtectedRoute>
              <AppShell>
                <HistoryPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/evenement/:id/historique/:version"
          element={
            <ProtectedRoute>
              <AppShell>
                <VersionPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        {/* « /evenement/nouveau » l'emporte sur ce motif : le routeur classe les
          segments fixes avant les variables, quel que soit l'ordre écrit ici. */}
        <Route
          path="/evenement/:id"
          element={
            <OpenRoute>
              <EventPage />
            </OpenRoute>
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
          path="/communaute"
          element={
            <ProtectedRoute>
              <AppShell>
                <CommunityPage />
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
        <Route
          path="/reglages"
          element={
            <ProtectedRoute>
              <AppShell>
                <SettingsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/comptes" replace />} />
        <Route
          path="/admin/comptes"
          element={
            <AdminPage>
              <AccountsPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/prospects"
          element={
            <AdminPage>
              <ProspectsPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/prospects/modeles"
          element={
            <AdminPage>
              <TemplatesPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/prospects/non-classes"
          element={
            <AdminPage>
              <UnclassifiedPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/prospects/:id"
          element={
            <AdminPage>
              <ProspectPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/signalements"
          element={
            <AdminPage>
              <ModerationPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/evenements"
          element={
            <AdminPage>
              <AdminEventsPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminPage>
              <CategoriesPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/temoignages"
          element={
            <AdminPage>
              <TestimonialsPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/enseignes/:id"
          element={
            <AdminPage>
              <EntityPage />
            </AdminPage>
          }
        />
        <Route
          path="/admin/personnes/:id"
          element={
            <AdminPage>
              <PersonPage />
            </AdminPage>
          }
        />
        {/* Une vitrine à la racine, comme dans la V1, lisible sans compte (lot 12) : les adresses
          fixes au-dessus l'emportent. */}
        <Route
          path="/:slug"
          element={
            <OpenRoute>
              <VitrineRoute />
            </OpenRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
