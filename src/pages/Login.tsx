import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Mail, Loader2, UserPlus, LogIn } from 'lucide-react'

export function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null)
  const { signIn } = useAuth()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkEmail = (emailToCheck: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!emailToCheck || !emailToCheck.includes('@')) {
      setIsNewUser(null)
      return
    }
    
    setChecking(true)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToCheck)
        .maybeSingle()
      
      setIsNewUser(data === null)
      setChecking(false)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Vérifie ta boîte mail</h1>
          <p className="text-muted-foreground">
            On t'a envoyé un lien magique à <strong>{email}</strong>.
            <br />
            Clique dessus pour te connecter.
          </p>
          <Button variant="ghost" onClick={() => setSent(false)}>
            Utiliser une autre adresse
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">F</span>
          </div>
          <h1 className="mt-6 text-2xl font-bold">Bienvenue sur Fellowship</h1>
          <p className="mt-2 text-muted-foreground">
            Entre ton email pour recevoir un lien de connexion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                checkEmail(e.target.value)
              }}
              onBlur={() => checkEmail(email)}
              placeholder="ton@email.com"
              required
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Indicateur nouveau compte / connexion */}
          {email && email.includes('@') && !checking && isNewUser !== null && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
              isNewUser 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                : 'bg-green-500/10 text-green-600 dark:text-green-400'
            }`}>
              {isNewUser ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Nouveau compte — on va te créer un accès</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Compte existant — on t'envoie un lien</span>
                </>
              )}
            </div>
          )}

          {checking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Vérification...</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading || checking}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isNewUser ? (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                Créer mon compte
              </>
            ) : (
              'Continuer avec Email'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Pas de mot de passe à retenir. Simple et sécurisé.
        </p>
      </div>
    </div>
  )
}
