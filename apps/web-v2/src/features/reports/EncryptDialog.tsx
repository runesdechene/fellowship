/**
 * QUOI     — la fenêtre « Chiffrer tes recettes » : Carte et Espèces, et la première fois la phrase
 *            de passe (deux fois) avec l'avertissement « Phrase oubliée, recettes perdues ». Sans
 *            `seal`, la même fenêtre sans montants : « Choisir ta phrase de passe ».
 * POURQUOI — maquette 2566:815 / 2574:803 : chiffrer une date remplace ses recettes saisies par
 *            deux montants que seule l'enseigne peut lire. Maquette 2580:463 : le bandeau de Mes
 *            bilans et les Réglages font choisir la phrase seule, rien n'est chiffré à ce moment-là.
 * ATTENTION — la phrase ne se demande que si l'enseigne n'en a pas (status 'none') ; sinon la clé
 *            est déjà ouverte et seuls les montants restent. Pendant l'enregistrement de la phrase,
 *            rien ne ferme la fenêtre. Habillée par apply-dialog.css (même fenêtre que
 *            « Candidater ») et report-secret.css.
 */
import { Lock, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isStrongPassphrase, MIN_PASSPHRASE_LENGTH, type SecretRevenue } from '@/lib/cipher'
import { parseAmount } from '@/lib/money'
import { RevenueKeyError, useRevenueKey } from '@/lib/revenue-key'

interface Seal {
  initial: SecretRevenue
  /** La date a des recettes saisies : la fenêtre prévient qu'elles seront remplacées. */
  replaces: boolean
  onSeal: (key: CryptoKey, revenue: SecretRevenue) => void
}

interface EncryptDialogProps {
  /** « Les Aventuriales, 25–27 juin 2026 », ou le nom de l'enseigne sans `seal`. */
  subtitle: string
  /** Absent : la fenêtre ne fait que choisir la phrase. */
  seal?: Seal
  onClose: () => void
}

/** Au-delà, le montant ne tient plus dans le message chiffré (lib/cipher.ts). */
const MAX_AMOUNT = 999_999.99

/** Le nombre seul : le « € » est posé à côté du champ, jamais dans ce qu'on tape. */
function draftOf(amount: number): string {
  return amount === 0 ? '' : String(amount).replace('.', ',')
}

function readAmount(draft: string): number | null {
  const amount = parseAmount(draft)
  if (amount === 'invalide' || (amount ?? 0) > MAX_AMOUNT) return null
  return amount ?? 0
}

export function EncryptDialog({ subtitle, seal, onClose }: EncryptDialogProps) {
  const { status, key, create } = useRevenueKey()
  // Figée à l'ouverture : la phrase créée ici ouvre la clé, la fenêtre ne doit pas changer de forme.
  const [withPhrase] = useState(status === 'none' || !seal)
  const [carte, setCarte] = useState(draftOf(seal?.initial.carte ?? 0))
  const [especes, setEspeces] = useState(draftOf(seal?.initial.especes ?? 0))
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
      if (key) seal?.onSeal(key, amounts)
      onClose()
      return
    }
    if (!isStrongPassphrase(phrase)) {
      setProblem(`Choisis une phrase d’au moins ${MIN_PASSPHRASE_LENGTH} caractères.`)
      return
    }
    if (phrase !== again) {
      setProblem('Les deux phrases ne sont pas les mêmes.')
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      const created = await create(phrase)
      seal?.onSeal(created, amounts)
      onClose()
    } catch (reason) {
      setProblem(
        reason instanceof RevenueKeyError
          ? reason.message
          : 'La phrase n’a pas pu être enregistrée.',
      )
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
            {seal ? 'Chiffrer tes recettes' : 'Choisir ta phrase de passe'}
          </h2>
          <p className="apply-dialog__subtitle">{subtitle}</p>
        </header>

        <div className="report-secret__content">
          {seal ? (
            <>
              <p className="report-secret__text">
                Tes recettes, carte et espèces, sont chiffrées sur ton appareil avant d’être
                enregistrées. Personne d’autre ne peut les lire, pas même l’équipe Fellowship. Elles
                restent masquées, même à zéro.
                {seal.replaces && ' Tes recettes actuelles seront remplacées par ces deux lignes.'}
              </p>
              <SecretField
                label="Carte"
                placeholder="0"
                value={carte}
                onChange={setCarte}
                inputMode="decimal"
              />
              <SecretField
                label="Espèces"
                placeholder="0"
                value={especes}
                onChange={setEspeces}
                inputMode="decimal"
              />
            </>
          ) : (
            <p className="report-secret__text">
              Tes recettes seront chiffrées sur ton appareil avant d’être enregistrées, dans tous
              tes nouveaux bilans. Personne d’autre ne pourra les lire, pas même l’équipe
              Fellowship. Tes bilans passés restent comme ils sont : tu peux les chiffrer un par un.
            </p>
          )}
          {withPhrase && (
            <>
              <SecretField
                label="Phrase de passe"
                placeholder={`${MIN_PASSPHRASE_LENGTH} caractères au moins`}
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
          {busy ? 'Un instant…' : seal ? 'Chiffrer mes recettes' : 'Choisir cette phrase'}
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
      {inputMode === 'decimal' && <span className="ledger__field-label">€</span>}
    </label>
  )
}
