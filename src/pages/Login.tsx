import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Mail, Loader2, Building2, UserPlus, ArrowLeft } from 'lucide-react'
import type { Profile } from '@/lib/database.types'

type Step = 'email' | 'confirm' | 'sent'

export function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundProfile, setFoundProfile] = useState<Profile | null>(null)

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Check if profile exists with this email
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    setFoundProfile(data)
    setStep('confirm')
    setLoading(false)
  }

  const handleConfirmSubmit = async () => {
    setLoading(true)
    setError(null)

    const { error } = await signIn(email)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setStep('sent')
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('email')
    setFoundProfile(null)
    setError(null)
  }

  // Step 1: Email input
  if (step === 'email') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">F</span>
            </div>
            <h1 className="mt-6 text-2xl font-bold">Bienvenue sur Fellowship</h1>
            <p className="mt-2 text-muted-foreground">
              Entre ton email pour continuer
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Continuer'
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

  // Step 2: Confirm (existing account or new)
  if (step === 'confirm') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Modifier l'email
          </button>

          {foundProfile ? (
            // Existing account
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-center">Compte trouvé</h1>
              
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                {foundProfile.avatar_url ? (
                  <img
                    src={foundProfile.avatar_url}
                    alt={foundProfile.company || 'Avatar'}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{foundProfile.company || 'Entreprise'}</p>
                  {foundProfile.bio && (
                    <p className="text-sm text-muted-foreground truncate">{foundProfile.bio}</p>
                  )}
                </div>
              </div>

              <p className="text-muted-foreground text-center">
                On t'envoie un lien de connexion à <strong>{email}</strong> ?
              </p>
            </div>
          ) : (
            // New account
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <UserPlus className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Nouveau compte</h1>
                <p className="mt-2 text-muted-foreground">
                  Aucune entreprise liée à
                </p>
                <p className="font-medium">{email}</p>
              </div>
              <p className="text-muted-foreground">
                On va créer ton compte Fellowship.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button onClick={handleConfirmSubmit} className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : foundProfile ? (
              'Recevoir le lien'
            ) : (
              'Créer mon compte'
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Step 3: Email sent
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
        <Button variant="ghost" onClick={handleBack}>
          Utiliser une autre adresse
        </Button>
      </div>
    </div>
  )
}
