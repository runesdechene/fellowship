/**
 * QUOI     — la fenêtre « Chiffrer tes recettes » : Carte et Espèces, et la première fois la phrase
 *            de passe (deux fois) avec l'avertissement « Phrase oubliée, recettes perdues ».
 * POURQUOI — maquette 2566:815 / 2574:803 : chiffrer une date remplace ses recettes saisies par
 *            deux montants que seule l'enseigne peut lire.
 * ATTENTION — la phrase ne se demande que si l'enseigne n'en a pas (status 'none') ; sinon la clé
 *            est déjà ouverte et seuls les montants restent. Pendant l'enregistrement de la phrase,
 *            rien ne ferme la fenêtre. Habillée par apply-dialog.css (même fenêtre que
 *            « Candidater ») et report-secret.css.
 */
import { Lock, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isStrongPassphrase, type SecretRevenue } from '@/lib/cipher'
import { formatEuros, parseAmount } from '@/lib/money'
import { useRevenueKey } from '@/lib/revenue-key'

interface EncryptDialogProps {
  /** « Les Aventuriales, 25–27 juin 2026 ». */
  subtitle: string
  initial: SecretRevenue
  /** La date a des recettes saisies : la fenêtre prévient qu'elles seront remplacées. */
  replaces: boolean
  onSeal: (key: CryptoKey, revenue: SecretRevenue) => void
  onClose: () => void
}

/** Au-delà, le montant ne tient plus dans le message chiffré (lib/cipher.ts). */
const MAX_AMOUNT = 999_999.99

function readAmount(draft: string): number | null {
  const amount = parseAmount(draft)
  if (amount === 'invalide' || (amount ?? 0) > MAX_AMOUNT) return null
  return amount ?? 0
}

export function EncryptDialog({
  subtitle,
  initial,
  replaces,
  onSeal,
  onClose,
}: EncryptDialogProps) {
  const { status, key, create } = useRevenueKey()
  // Figée à l'ouverture : la phrase créée ici ouvre la clé, la fenêtre ne doit pas changer de forme.
  const [withPhrase] = useState(status === 'none')
  const [carte, setCarte] = useState(formatEuros(initial.carte))
  const [especes, setEspeces] = useState(formatEuros(initial.especes))
  const [phrase, setPhrase] = useState('')
  const [again, setAgain] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  async function submit() {
    const revenue = { carte: readAmount(carte), especes: readAmount(especes) }
    if (revenue.carte === null || revenue.especes === null) {
      setProblem('Ce montant n’est pas valide.')
      return
    }
    const amounts = { carte: revenue.carte, especes: revenue.especes }
    if (!withPhrase) {
      if (key) onSeal(key, amounts)
      onClose()
      return
    }
    if (!isStrongPassphrase(phrase)) {
      setProblem('Choisis une phrase d’au moins quatre mots et vingt caractères.')
      return
    }
    if (phrase !== again) {
      setProblem('Les deux phrases ne sont pas les mêmes.')
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      onSeal(await create(phrase), amounts)
      onClose()
    } catch {
      setProblem('La phrase n’a pas pu être enregistrée.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="apply-dialog"
      aria-labelledby="encrypt-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <form
        className="apply-dialog__card"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <header>
          <h2 id="encrypt-dialog-title" className="apply-dialog__title">
            Chiffrer tes recettes
          </h2>
          <p className="apply-dialog__subtitle">{subtitle}</p>
        </header>

        <div className="report-secret__content">
          <p className="report-secret__text">
            Tes recettes, carte et espèces, sont chiffrées sur ton appareil avant d’être
            enregistrées. Personne d’autre ne peut les lire, pas même l’équipe Fellowship. Elles
            restent masquées, même à zéro.
            {replaces && ' Tes recettes actuelles seront remplacées par ces deux lignes.'}
          </p>
          <SecretField label="Carte" value={carte} onChange={setCarte} inputMode="decimal" />
          <SecretField label="Espèces" value={especes} onChange={setEspeces} inputMode="decimal" />
          {withPhrase && (
            <>
              <SecretField
                label="Phrase de passe"
                placeholder="quatre mots, par exemple"
                value={phrase}
                onChange={setPhrase}
                secret
              />
              <SecretField
                label="Encore une fois"
                placeholder="la même phrase"
                value={again}
                onChange={setAgain}
                secret
              />
              <p className="report-secret__warning">
                <TriangleAlert size={15} strokeWidth={1.5} />
                Phrase oubliée, recettes perdues : personne ne pourra les retrouver, pas même nous.
                Elle sert pour tous tes bilans, sur tous tes appareils.
              </p>
            </>
          )}
          {problem && (
            <p className="report-secret__problem" role="status">
              {problem}
            </p>
          )}
        </div>

        <button type="submit" className="apply-dialog__go" disabled={busy}>
          <Lock size={13} strokeWidth={2} />
          {busy ? 'Un instant…' : 'Chiffrer mes recettes'}
        </button>
      </form>
    </dialog>
  )
}

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  secret = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputMode?: 'decimal'
  secret?: boolean
}) {
  return (
    <label className="ledger__field report-secret__field">
      <span className="ledger__field-label">{label}</span>
      <input
        className="ledger__field-input"
        type={secret ? 'password' : 'text'}
        autoComplete={secret ? 'new-password' : 'off'}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
    </label>
  )
}
