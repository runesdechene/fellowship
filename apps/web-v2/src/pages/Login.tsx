/**
 * QUOI     — la connexion : l'e-mail, puis le code à six chiffres ; le mur d'affiches à droite.
 * POURQUOI — maquettes 2100:2 et 2100:38 (lot 10a). Le même e-mail connecte un habitué ou crée le
 *            compte d'un nouveau venu ; la session ouverte ici est aussi celle de la V1 (même
 *            origine).
 * ATTENTION — un code complet se vérifie seul ; un code faux vide les cases et le focus revient à
 *            la première, prête pour un nouvel essai.
 */
import { ArrowRight, ChevronLeft, Mail } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { CodeInput } from '@/components/ui/CodeInput'
import { LoginWall } from '@/features/login/LoginWall'
import { useAuth } from '@/lib/auth'

type Step = 'email' | 'code'

const RESEND_AFTER = 60

export function Login() {
  const { signIn, verifyOtp } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wait, setWait] = useState(RESEND_AFTER)

  // Le décompte avant de pouvoir renvoyer un code, réarmé à chaque envoi.
  useEffect(() => {
    if (step !== 'code' || wait === 0) return
    const timer = window.setTimeout(() => {
      setWait((seconds) => seconds - 1)
    }, 1000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [step, wait])

  async function send() {
    setBusy(true)
    setError(null)
    const { error: sendError } = await signIn(email.trim())
    setBusy(false)
    if (sendError) {
      setError('L’envoi n’a pas abouti. Vérifie ton adresse, puis réessaie.')
      return
    }
    setCode('')
    setWait(RESEND_AFTER)
    setStep('code')
  }

  async function check(full: string) {
    setBusy(true)
    setError(null)
    const { error: codeError } = await verifyOtp(email.trim(), full)
    setBusy(false)
    if (codeError) {
      setError('Ce code ne marche pas. Vérifie-le, ou renvoie-en un.')
      setCode('')
    }
  }

  function onCode(next: string) {
    setCode(next)
    if (next.length === 6) void check(next)
  }

  return (
    <div className="door">
      <div className="door__side">
        <img className="door__logo" src={`${import.meta.env.BASE_URL}icon.png`} alt="Fellowship" />
        {step === 'email' ? (
          <form
            className="door__form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              void send()
            }}
          >
            <div className="door__head">
              <h1 className="door__title">Bienvenue sur Fellowship</h1>
              <p className="door__lead">
                Ton e-mail suffit : on t’envoie un code, pas de mot de passe à retenir.
              </p>
            </div>
            <label className="door__field">
              <span className="door__label">E-mail</span>
              <span className="door__input">
                <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="ton@adresse.fr"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                  }}
                />
              </span>
            </label>
            <button type="submit" className="door__submit" disabled={busy}>
              {busy ? 'Envoi…' : 'Recevoir mon code'}
              {!busy && <ArrowRight size={16} strokeWidth={2} />}
            </button>
            {error && <p className="door__error">{error}</p>}
            <p className="door__note">
              Nouveau ? Le même e-mail crée ton compte en quelques secondes.
            </p>
          </form>
        ) : (
          <div className="door__form">
            <button
              type="button"
              className="door__back"
              onClick={() => {
                setStep('email')
                setError(null)
              }}
            >
              <ChevronLeft size={14} strokeWidth={2} />
              Changer d’e-mail
            </button>
            <div className="door__head">
              <h1 className="door__title">Ton code</h1>
              <p className="door__lead">
                Envoyé à <b>{email.trim()}</b>.
              </p>
            </div>
            <CodeInput value={code} onChange={onCode} disabled={busy} autoFocus />
            {error && <p className="door__error">{error}</p>}
            <p className="door__note">
              Pas reçu ? Regarde dans tes indésirables, ou{' '}
              {wait > 0 ? (
                `renvoie un code dans ${String(wait)} s.`
              ) : (
                <button type="button" className="door__resend" onClick={() => void send()}>
                  renvoie un code
                </button>
              )}
            </p>
          </div>
        )}
        <p className="door__legal">
          En continuant, tu acceptes les <a href="/legal/cgu">CGU</a> et la{' '}
          <a href="/legal/confidentialite">Politique de confidentialité</a>.
        </p>
      </div>
      <LoginWall />
    </div>
  )
}
