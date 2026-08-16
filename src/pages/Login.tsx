import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'

type Step = 'email' | 'code'

/**
 * Écran de connexion — hors maquette, réduit au strict nécessaire pour entrer.
 * Aucune création de compte ici : la V2 n'intègre pas encore d'inscription.
 */
export function Login() {
  const { signIn, verifyOtp } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEmail(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error: signInError } = await signIn(email.trim())
    setBusy(false)
    if (signInError) {
      setError("Aucun compte pour cette adresse, ou l'envoi a échoué.")
      return
    }
    setStep('code')
  }

  async function handleCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error: otpError } = await verifyOtp(email.trim(), code.trim())
    setBusy(false)
    if (otpError) setError('Code invalide ou expiré.')
  }

  return (
    <div className="login">
      <div className="login__card">
        <img className="login__logo" src="/logo.png" alt="Fellowship" />

        {step === 'email' ? (
          <>
            <h1 className="login__title">Connexion</h1>
            <p className="login__hint">On t’envoie un code à six chiffres.</p>
            <form className="login__form" onSubmit={handleEmail}>
              <input
                className="login__input"
                type="email"
                required
                autoFocus
                placeholder="ton@adresse.fr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button type="submit" block disabled={busy}>
                {busy ? 'Envoi…' : 'Recevoir mon code'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="login__title">Ton code</h1>
            <p className="login__hint">Envoyé à {email}</p>
            <form className="login__form" onSubmit={handleCode}>
              <input
                className="login__input"
                inputMode="numeric"
                required
                autoFocus
                placeholder="000000"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <Button type="submit" block disabled={busy}>
                {busy ? 'Vérification…' : 'Entrer'}
              </Button>
            </form>
          </>
        )}

        {error && <p className="login__message login__message--error">{error}</p>}
      </div>
    </div>
  )
}
