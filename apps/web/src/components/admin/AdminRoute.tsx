import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

/**
 * Garde de la zone admin.
 *
 * Pourquoi un état `identityLoading` séparé de `loading` : le boot Supabase publie
 * une session AVANT que `users.role` et `profiles.role` n'aient été lus en DB.
 * Sans attendre, un admin se voit éjecté vers /explorer parce qu'au moment du rendu
 * `loading=false && isAdmin=false` (faux négatif). L'ancien fix posait un setTimeout
 * 1.5s wall-clock — bandaid : trop court sur connexion lente, gaspillé sur connexion
 * rapide. La bonne primitive : `identityLoading` reste vrai jusqu'à ce que les fetchs
 * d'identité (profile + person) aient tous deux résolu.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, identityLoading, isAdmin } = useAuth()

  // Attente : session pas finie de booter, ou (utilisateur logué et) identité pas encore lue.
  if (loading || (user && identityLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user && isAdmin) return <>{children}</>
  return <Navigate to="/explorer" replace />
}
