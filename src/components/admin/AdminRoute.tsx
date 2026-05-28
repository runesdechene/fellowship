import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth()

  // Délai de grâce avant de décider de rediriger : profile/person sont fetchés async
  // dans le boot d'auth, et isAdmin reste momentanément false (rôle pas encore lu)
  // alors que loading est déjà à false. Sans grâce, un admin est éjecté sur /explorer
  // avant que son rôle n'arrive.
  // Si dès que isAdmin devient true on rend immédiatement (pas d'attente).
  // Si non-admin, on attend 1.5s par sécurité puis on redirige.
  const [graceExpired, setGraceExpired] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGraceExpired(true), 1500)
    return () => clearTimeout(t)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Happy path : user admin chargé → on rend les enfants direct.
  if (user && isAdmin) return <>{children}</>

  // Pas encore admin (race possible) → on attend un peu avant de juger.
  if (!graceExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Grace expirée, pas admin → redirect.
  return <Navigate to="/explorer" replace />
}
