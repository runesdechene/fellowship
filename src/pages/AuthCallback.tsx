import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export function AuthCallbackPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (user) {
      // User is authenticated — redirect based on profile state
      if (!profile || !profile.display_name) {
        navigate('/onboarding', { replace: true })
      } else if (profile.type === 'exposant') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/explorer', { replace: true })
      }
    } else {
      // No user after loading complete — token was invalid or expired
      navigate('/login', { replace: true })
    }
  }, [user, profile, loading, navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Connexion en cours...</p>
    </div>
  )
}
