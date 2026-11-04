/**
 * QUOI     — le champ en bas d'une story : on y répond au sujet sans quitter la story.
 * POURQUOI — option C de la maquette Story (Uriel, 05/11/2026) : répondre comme sur Instagram.
 *            Le message part dans la discussion, puis la discussion s'ouvre pour qu'on le voie.
 * ATTENTION — texte seul : pour une photo ou une vidéo, on passe par la discussion complète.
 */
import { useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { sendMessage } from '@/lib/discussion-api'

interface Props {
  conversationId: string
  placeholder: string
  onSent: () => void
}

export function StoryReply({ conversationId, placeholder, onSent }: Props) {
  const { actor } = useAuth()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function send() {
    if (!actor || busy || !text.trim()) return
    setBusy(true)
    setProblem(null)
    try {
      await sendMessage(actor.id, conversationId, text, null)
      onSent()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Le message n’est pas parti. Réessaie.')
      setBusy(false)
    }
  }

  return (
    <form
      className="story-reply"
      onSubmit={(event) => {
        event.preventDefault()
        void send()
      }}
    >
      {problem && (
        <p className="story-reply__problem" role="alert">
          {problem}
        </p>
      )}
      <div className="story-reply__field">
        <input
          className="story-reply__input"
          value={text}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="send"
          onChange={(event) => setText(event.target.value)}
        />
        {text.trim() && (
          <button type="submit" className="story-reply__send" aria-label="Envoyer" disabled={busy}>
            <ArrowUp size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </form>
  )
}
