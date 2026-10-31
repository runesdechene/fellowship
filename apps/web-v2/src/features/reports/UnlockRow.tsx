/**
 * QUOI     — la ligne « Phrase de passe » + « Afficher » du registre : elle ouvre la clé des
 *            recettes de l'enseigne pour la session, et dit « Phrase incorrecte » sur un échec.
 * POURQUOI — maquette 2566:524 / 2574:518 : des recettes chiffrées et verrouillées se lisent en
 *            tapant la phrase une fois ; toutes les dates s'ouvrent avec elle (lib/revenue-key.tsx).
 * ATTENTION — la dérivation de la clé prend une seconde (600 000 tours) : le bouton se bloque
 *            pendant ce temps. Le texte d'aide est plus court sur téléphone, comme la maquette.
 */
import { Eye } from 'lucide-react'
import { useState } from 'react'
import { useRevenueKey } from '@/lib/revenue-key'

export function UnlockRow({ onOpen }: { onOpen?: () => void }) {
  const { unlock } = useRevenueKey()
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [phone] = useState(() => window.matchMedia('(width <= 760px)').matches)

  async function submit() {
    setBusy(true)
    setWrong(false)
    const opened = await unlock(phrase).catch(() => false)
    setBusy(false)
    if (!opened) {
      setWrong(true)
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
      {wrong && (
        <p className="report-secret__wrong" role="status">
          Phrase incorrecte
        </p>
      )}
    </form>
  )
}
