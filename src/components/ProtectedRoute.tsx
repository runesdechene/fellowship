import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useProfile } from '@/hooks/useProfile'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireOnboarding?: boolean
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const location = useLocation()

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirect to onboarding if profile doesn't exist or onboarding not completed
  if (requireOnboarding && (!profile || !profile.onboarding_completed) && location.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />
  }

  // Redirect away from onboarding if already completed
  if (location.pathname === '/app/onboarding' && profile?.onboarding_completed) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
