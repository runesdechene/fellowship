/**
 * QUOI     — « Nouveau message » (maquette Story) : choisir une ou plusieurs personnes ; à deux et
 *            plus, c'est un groupe, son nom est facultatif.
 * POURQUOI — à deux, la conversation est unique : écrire à quelqu'un rouvre l'existante (la base
 *            l'impose).
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { openConversation } from '@/lib/discussion-api'
import type { Person } from '@/lib/discussions'
import { PeoplePicker } from './PeoplePicker'

export function NewMessagePage() {
  const { actor } = useAuth()
  const navigate = useNavigate()
  const [chosen, setChosen] = useState<Person[]>([])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const group = chosen.length > 1

  async function create() {
    if (!actor || chosen.length === 0 || busy) return
    setBusy(true)
    setProblem(null)
    try {
      const id = await openConversation(
        actor.id,
        chosen.map((person) => person.id),
        group ? title : '',
      )
      void navigate(`/messages/${id}`, { replace: true })
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : 'La conversation ne s’ouvre pas. Réessaie.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="new-message">
      <header className="new-message__head">
        <Button variant="icon" aria-label="Fermer" onClick={() => void navigate(-1)}>
          <X size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="new-message__title">Nouveau message</h1>
      </header>
      <PeoplePicker chosen={chosen} onChange={setChosen} />
      {group && (
        <label className="new-message__group">
          <input
            value={title}
            maxLength={60}
            placeholder="Nom du groupe"
            aria-label="Nom du groupe"
            onChange={(event) => setTitle(event.target.value)}
          />
          <span className="new-message__hint">
            Le nom est facultatif. À partir de deux personnes, c’est un groupe.
          </span>
        </label>
      )}
      {problem && (
        <p className="new-message__problem" role="alert">
          {problem}
        </p>
      )}
      <footer className="new-message__foot">
        <Button
          variant="action"
          block
          disabled={chosen.length === 0 || busy}
          onClick={() => void create()}
        >
          {group ? `Créer le groupe, ${String(chosen.length + 1)} personnes` : 'Écrire'}
        </Button>
      </footer>
    </div>
  )
}
