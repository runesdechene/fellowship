/**
 * QUOI     — les routes de la V2 et leurs gardes : landing (sans compte sur `/`, pour tous sur
 *            `/decouvrir`), recherche publique (`/festivals`), connexion, arrivée, tableau de
 *            bord, calendrier, création, fiche (ouverte sans compte), avis, explorer, bilans,
 *            offre Pro, réglages, vitrine, administration (admins seulement, `/admin`).
 * POURQUOI — chaque écran a une adresse ; la garde (useV2Access) n'ouvre la V2 qu'aux admins et
 *            au rôle `v2`, et renvoie les autres sur la V1 ; un compte sans prénom passe d'abord par
 *            l'arrivée (lot 10a).
 */
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { GuestShell } from '@/components/layout/GuestShell'
import { AccountsPage } from '@/features/admin-accounts/AccountsPage'
import { ProspectPage } from '@/features/admin-prospects/ProspectPage'
import { ProspectsPage } from '@/features/admin-prospects/ProspectsPage'
import { TemplatesPage } from '@/features/admin-prospects/TemplatesPage'
import { UnclassifiedPage } from '@/features/admin-prospects/UnclassifiedPage'
import { EntityPage } from '@/features/admin-entity/EntityPage'
import { PersonPage } from '@/features/admin-person/PersonPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { CommunityPage } from '@/features/community/CommunityPage'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { CreateEvent } from '@/features/event-create/CreateEvent'
import { EditEvent } from '@/features/event-edit/EditEvent'
import { HistoryPage } from '@/features/event-history/HistoryPage'
import { VersionPage } from '@/features/event-history/VersionPage'
import { EventPage } from '@/features/event/EventPage'
import { ExplorerPage } from '@/features/explorer/ExplorerPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { PublicSearchPage } from '@/features/public-search/PublicSearchPage'
import { ProPage } from '@/features/pro/ProPage'
import { ReportPage } from '@/features/reports/ReportPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { WriteReviewPage } from '@/features/review/WriteReviewPage'
import { VitrinePage } from '@/features/vitrine/VitrinePage'
import { WelcomePage } from '@/features/welcome/WelcomePage'
import { Login } from '@/pages/Login'
import { Unsubscribe } from '@/pages/Unsubscribe'
import { useAuth } from '@/lib/auth'
import { useV2Access } from '@/lib/useV2Access'
import { safeReturn } from '@/lib/welcome'
import { welcomeKind } from '@/lib/welcome-guard'
import { useEffect, type ReactNode } from 'react'

/** La garde d'accès seule : la V2 n'ouvre qu'aux admins et au rôle `v2` jusqu'à la bascule (lot 12).
 *  `guest` remplace la connexion pour un visiteur sans compte (la landing, sur `/`). */
function AccessRoute({ children, guest }: { children: ReactNode; guest?: ReactNode }) {
  const decision = useV2Access()
  if (decision === 'wait') return null
  if (decision === 'login') return guest ?? <Navigate to="/connexion" replace />
  if (decision === 'leave') return <LeaveToV1 />
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

// Hors du routeur de la V2 (basename /v2) : la V1 vit à la racine du domaine.
function LeaveToV1() {
  useEffect(() => {
    window.location.replace('/')
  }, [])
  return null
}

export function App() {
  return (
    <Routes>
      {/* La landing pour tout le monde, connecté ou non : pour la relire sans se déconnecter. */}
      <Route path="/decouvrir" element={<LandingPage />} />
      <Route path="/festivals" element={<PublicSearchRoute />} />
      <Route path="/desinscription" element={<Unsubscribe />} />
      <Route path="/connexion" element={<LoginRoute />} />
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
          <ProtectedRoute
            guest={
              <GuestShell>
                <EventPage />
              </GuestShell>
            }
          >
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
