/**
 * QUOI     — la ligne « Phrase de passe » + « Afficher » du registre : elle ouvre la clé des
 *            recettes de l'enseigne pour la session, et dit pourquoi elle ne s'ouvre pas.
 * POURQUOI — maquette 2566:524 / 2574:518 : des recettes chiffrées et verrouillées se lisent en
 *            tapant la phrase une fois ; toutes les dates s'ouvrent avec elle (lib/revenue-key.tsx).
 * ATTENTION — la dérivation de la clé prend une seconde (600 000 tours) : le bouton se bloque
 *            pendant ce temps. Le texte d'aide est plus court sur téléphone, comme la maquette.
 *            Une panne de réseau ne dit JAMAIS « Phrase incorrecte » : l'exposant pourrait
 *            réinitialiser sa phrase et tout perdre.
 */
import { Eye } from 'lucide-react'
import { useState } from 'react'
import { useRevenueKey } from '@/lib/revenue-key'

const PROBLEMS = {
  wrong: 'Phrase incorrecte',
  reset: 'Ta phrase a été réinitialisée',
  offline: 'Connexion impossible, réessaie.',
}

export function UnlockRow({ onOpen }: { onOpen?: () => void }) {
  const { unlock } = useRevenueKey()
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [phone] = useState(() => window.matchMedia('(width <= 760px)').matches)

  async function submit() {
    setBusy(true)
    setProblem(null)
    const outcome = await unlock(phrase).catch(() => 'offline' as const)
    setBusy(false)
    if (outcome !== 'ok') {
      setProblem(PROBLEMS[outcome])
      return
    }
    setPhrase('')
    onOpen?.()
  }

  return (
    <form
      className="report-secret__unlock"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <label className="ledger__field report-secret__phrase">
        <span className="ledger__field-label">Phrase de passe</span>
        <input
          className="ledger__field-input"
          type="password"
          autoComplete="current-password"
          placeholder={phone ? 'ta phrase' : 'tape ta phrase pour afficher tes recettes'}
          value={phrase}
          onChange={(event) => {
            setPhrase(event.target.value)
          }}
        />
      </label>
      <button type="submit" className="ledger__submit" disabled={busy || phrase.trim() === ''}>
        <Eye size={14} strokeWidth={2} />
        Afficher
      </button>
      {problem && (
        <p className="report-secret__wrong" role="status">
          {problem}
        </p>
      )}
    </form>
  )
}
