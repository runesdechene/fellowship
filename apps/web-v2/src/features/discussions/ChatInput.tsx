/**
 * QUOI     — la saisie d'un tchat : joindre une photo ou une vidéo, écrire, envoyer.
 * POURQUOI — comme sur WhatsApp : « Entrée » envoie, « Maj + Entrée » passe à la ligne, une image
 *            collée dans le champ se joint au message ; l'envoi se fait au nom de l'acteur actif.
 *            En modification, le champ reprend le texte du message : « Entrée » l'enregistre,
 *            « Échap » ou la croix l'abandonne.
 *            Un festival joint (`eventId`, venu du fil de Ma communauté) part avec le message suivant.
 * ATTENTION — le parent change la `key` à chaque message modifié : le champ repart de son texte.
 */
import { useRef, useState } from 'react'
import { ArrowUp, ImagePlus, Plus, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { sendMessage, uploadMedia, type Media } from '@/lib/discussion-api'
import type { Bubble } from '@/lib/discussions'
import { FestivalAttachment } from './FestivalAttachment'
import { MentionList } from './MentionList'
import { useMentions } from './useMentions'

interface Props {
  conversationId: string
  placeholder: string
  editing: Bubble | null
  onEdit: (messageId: string, body: string, mentions: string[]) => Promise<void>
  onEditDone: () => void
  /** Le festival joint au prochain message, et de quoi le retirer. */
  eventId: string | null
  onDetach: () => void
  /** Un sujet : « @ » tague un exposant. Les groupes et les conversations à deux n'en ont pas. */
  mentions?: boolean
}

export function ChatInput({
  conversationId,
  placeholder,
  editing,
  onEdit,
  onEditDone,
  eventId,
  onDetach,
  mentions = false,
}: Props) {
  const { actor } = useAuth()
  const [text, setText] = useState(editing?.body ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const mention = useMentions(field, setText, editing?.mentions)

  async function send() {
    if (!actor || busy || (!text.trim() && !file)) return
    setBusy(true)
    setProblem(null)
    try {
      if (editing) {
        await onEdit(editing.id, text, mentions ? mention.ids(text) : [])
        onEditDone()
        return
      }
      let media: Media | null = null
      if (file) {
        const uploaded = await uploadMedia(actor.id, file)
        if (typeof uploaded === 'string') throw new Error(uploaded)
        media = uploaded
      }
      const tagged = mentions ? mention.ids(text) : []
      await sendMessage(actor.id, conversationId, text, media, eventId, tagged)
      setText('')
      mention.reset()
      setFile(null)
      if (eventId) onDetach()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Le message n’est pas parti. Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="chat-input"
      onSubmit={(event) => {
        event.preventDefault()
        void send()
      }}
    >
      {problem && (
        <p className="chat-input__problem" role="alert">
          {problem}
        </p>
      )}
      {editing && (
        <p className="chat-input__file">
          Modification du message
          <button type="button" aria-label="Annuler la modification" onClick={onEditDone}>
            <X size={12} strokeWidth={2.5} />
          </button>
        </p>
      )}
      {mentions && <MentionList {...mention.list} />}
      {eventId && !editing && <FestivalAttachment eventId={eventId} onRemove={onDetach} />}
      {file && (
        <p className="chat-input__file">
          {file.name}
          <button type="button" aria-label="Retirer le fichier" onClick={() => setFile(null)}>
            <X size={12} strokeWidth={2.5} />
          </button>
        </p>
      )}
      <div className="chat-input__row">
        {!editing && (
          <label className="chat-input__attach" aria-label="Joindre une photo ou une vidéo">
            <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        )}
        <div className="chat-input__field">
          <textarea
            ref={field}
            rows={1}
            value={text}
            placeholder={placeholder}
            aria-label="Message"
            onChange={(event) => {
              setText(event.target.value)
              if (mentions) mention.track(event.target.value, event.target.selectionStart)
            }}
            onPaste={(event) => {
              const image = [...event.clipboardData.files].find((pasted) =>
                pasted.type.startsWith('image/'),
              )
              if (!image || editing) return
              event.preventDefault()
              setFile(image)
            }}
            autoFocus={!!editing}
            onKeyDown={(event) => {
              if (mentions && mention.keyDown(event)) return
              if (event.key === 'Escape' && editing) {
                event.preventDefault()
                onEditDone()
              }
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
          />
          {!editing && (
            <label className="chat-input__photo" aria-label="Ajouter une photo">
              <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
        <button
          type="submit"
          className="chat-input__send"
          aria-label="Envoyer"
          disabled={busy || (!text.trim() && !file)}
        >
          <ArrowUp size={18} strokeWidth={2.2} />
        </button>
      </div>
    </form>
  )
}
