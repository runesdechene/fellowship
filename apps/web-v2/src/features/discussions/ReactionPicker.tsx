/**
 * QUOI     — la rangée d'emojis posée au-dessus d'une bulle (maquette Story, « Réagir ») : six
 *            réactions, et « + » pour en taper une autre au clavier.
 * POURQUOI — réagir comme sur WhatsApp (Uriel, 04/11/2026). « + » ouvre un champ : le clavier du
 *            téléphone a déjà tous les emojis, pas besoin d'en dessiner une grille.
 * ATTENTION — toucher l'emoji déjà choisi le retire ; c'est le fil qui en décide (onPick).
 */
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { firstEmoji, REACTIONS } from '@/lib/discussions'

interface Props {
  mine: string | null
  onPick: (emoji: string) => void
}

export function ReactionPicker({ mine, onPick }: Props) {
  const [typing, setTyping] = useState(false)
  return (
    <div className="reaction-picker" role="group" aria-label="Réagir">
      {typing ? (
        <input
          className="reaction-picker__other"
          aria-label="Un autre emoji"
          placeholder="Ton emoji"
          autoFocus
          onChange={(event) => {
            const emoji = firstEmoji(event.target.value)
            if (emoji) onPick(emoji)
          }}
        />
      ) : (
        <>
          {REACTIONS.map((emoji, index) => (
            <button
              key={emoji}
              type="button"
              className={
                emoji === mine ? 'reaction-picker__emoji is-mine' : 'reaction-picker__emoji'
              }
              aria-pressed={emoji === mine}
              autoFocus={index === 0}
              onClick={() => onPick(emoji)}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            className="reaction-picker__more"
            aria-label="Un autre emoji"
            onClick={() => setTyping(true)}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  )
}
