import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { Mail, Loader2, Store, Compass, ArrowLeft } from 'lucide-react'

type AccountType = 'exposant' | 'public'
type Step = 'type' | 'email' | 'sent'

export function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth()

  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<AccountType | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleTypeSelect = (type: AccountType) => {
    setSelectedType(type)
    setStep('email')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType) return
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, selectedType)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setStep('sent')
      setLoading(false)
    }
  }

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (step === 'sent') {
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
              setStep('email')
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

  // ── Email form ────────────────────────────────────────────────────────────
  if (step === 'email') {
    const isExposant = selectedType === 'exposant'
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <Link to="/" className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm hover:opacity-90 transition-opacity">
              <span className="text-lg font-extrabold text-primary-foreground">F</span>
            </Link>
            <div className="text-center">
              <h1 className="text-2xl font-bold">
                {isExposant ? 'Espace exposant' : 'Découvrir des événements'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre ton email pour recevoir un lien de connexion
              </p>
            </div>
          </div>

          {/* Account type badge */}
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              isExposant
                ? 'bg-fellowship-purple-light text-fellowship-purple'
                : 'bg-fellowship-orange-light text-fellowship-orange'
            }`}
          >
            {isExposant ? (
              <Store className="h-4 w-4 shrink-0" />
            ) : (
              <Compass className="h-4 w-4 shrink-0" />
            )}
            {isExposant ? 'Artisan / Exposant' : 'Découvreur d\'événements'}
            <button
              type="button"
              onClick={() => setStep('type')}
              className="ml-auto text-xs underline opacity-70 hover:opacity-100"
            >
              Changer
            </button>
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
                  <Mail className="h-5 w-5" />
                  Continuer avec Email
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Pas de mot de passe. Simple et sécurisé.
          </p>
        </div>
      </div>
    )
  }

  // ── Account type selection (default step) ─────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm hover:opacity-90 transition-opacity">
            <span className="text-lg font-extrabold text-primary-foreground">F</span>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Bienvenue sur Fellowship</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Quel type de compte veux-tu créer ?
            </p>
          </div>
        </div>

        {/* Type cards */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleTypeSelect('exposant')}
            className="group w-full rounded-2xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fellowship-purple-light text-fellowship-purple transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Je suis exposant</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Artisan, créateur, exposant — gère tes festivals
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSelect('public')}
            className="group w-full rounded-2xl border-2 border-border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fellowship-orange-light text-fellowship-orange transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Je découvre des événements</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Trouve des événements et suis tes artisans préférés
                </p>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Tu peux changer d'avis plus tard depuis les réglages.
        </p>
      </div>
    </div>
  )
}
