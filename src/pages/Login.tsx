import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'

export function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Check ton email</h1>
            <p className="text-muted-foreground">
              On t'a envoyé un lien magique à{' '}
              <span className="font-semibold text-foreground">{email}</span>.
              <br />
              Clique dessus pour accéder à ton compte.
            </p>
          </div>
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Utiliser une autre adresse
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Link to="/">
            <img src="/icon.png" alt="Fellowship" className="h-12 w-12" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Se connecter</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre ton email pour recevoir un lien de connexion
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            required
            autoFocus
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                Continuer
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Pas de mot de passe. Simple et sécurisé.<br />
          Nouveau ? Tu seras guidé après ta première connexion.
        </p>
      </div>
    </div>
  )
}
