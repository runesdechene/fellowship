import { useState, useRef, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import { Toast } from '@/components/ui/toast'

export function LoginPage() {
  const { user, loading: authLoading, signIn, verifyOtp } = useAuth()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus first code input when OTP screen shows
  useEffect(() => {
    if (sent) inputRefs.current[0]?.focus()
  }, [sent])

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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    const fullCode = newCode.join('')
    if (fullCode.length === 6) {
      handleVerify(fullCode)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newCode = [...code]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ''
    }
    setCode(newCode)

    if (pasted.length === 6) {
      handleVerify(pasted)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  const handleVerify = async (otp: string) => {
    setVerifying(true)
    setError(null)

    const { error } = await verifyOtp(email, otp)

    if (error) {
      setError('Code invalide ou expiré. Réessaie.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
    setVerifying(false)
  }

  // OTP verification screen
  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl">Entre ton code</h1>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
              Un code à 6 chiffres a été envoyé à{' '}
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>

          {/* OTP input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={verifying}
                className="h-13 w-11 rounded-xl border border-input bg-card text-center text-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {verifying && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification...
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={async () => {
                await handleSendCode({ preventDefault: () => {} } as React.FormEvent)
                setToast('Code renvoyé !')
              }}
              className="text-sm text-primary hover:underline"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Renvoyer le code
            </button>
            <br />
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => {
                setSent(false)
                setEmail('')
                setCode(['', '', '', '', '', ''])
                setError(null)
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Changer d'adresse
            </Button>
          </div>

          {toast && (
            <Toast message={toast} variant="success" onDismiss={() => setToast(null)} />
          )}
        </div>
      </div>
    )
  }

  // Email entry screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Link to="/">
            <img src="/icon.png" alt="Fellowship" className="h-12 w-12" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl">Se connecter</h1>
            <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
              Entre ton email pour recevoir un code de connexion
            </p>
          </div>
        </div>

        <form onSubmit={handleSendCode} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            required
            autoFocus
            className="w-full rounded-full border border-input bg-card px-5 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                Recevoir mon code
              </>
            )}
          </Button>
        </form>

        <button
          onClick={() => { if (email) setSent(true); else setError('Entre ton email d\'abord') }}
          className="block w-full text-center text-sm text-primary hover:underline"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          J'ai déjà un code
        </button>

        <p className="text-center text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          Pas de mot de passe. Simple et sécurisé.<br />
          Nouveau ? Tu seras guidé après ta première connexion.
        </p>
      </div>
    </div>
  )
}
