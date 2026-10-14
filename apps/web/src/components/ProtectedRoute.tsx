import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, person } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Le rôle `v2` n'a que la V2 (migration 20261012150000_role_v2_et_role_protege).
  if (person?.role === 'v2') {
    window.location.replace('/v2/')
    return null
  }

  return <>{children}</>
}
