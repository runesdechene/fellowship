import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, profile, person } = useAuth()

  // Race condition : loading peut passer à false AVANT que profile/person ne soient
  // fetchés (les requêtes sont lancées sans await dans onAuthStateChange).
  // Sans cette garde, un admin était éjecté sur /explorer momentanément avant que
  // son rôle ne soit lu. Si user existe mais ni profile ni person n'a encore chargé,
  // on attend.
  const profileLoaded = !user || profile !== null || person !== null

  if (loading || !profileLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/explorer" replace />
  }

  return <>{children}</>
}
