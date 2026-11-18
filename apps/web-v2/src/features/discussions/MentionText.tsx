/**
 * QUOI     — un texte de sujet avec ses @Nom en gras, chacun menant à la vitrine de l'exposant.
 * POURQUOI — maquette Story 2844:1123 (Uriel, 18/11/2026) : le tag se lit dans la couleur du
 *            texte, en gras, sans autre décor.
 */
import { Link } from 'react-router-dom'
import { splitMentions, type Mention } from '@/lib/mentions'

export function MentionText({ text, mentions }: { text: string; mentions: Mention[] }) {
  if (mentions.length === 0) return text
  return splitMentions(text, mentions).map((part, index) =>
    typeof part === 'string' ? (
      part
    ) : (
      <Link key={`${part.id}-${String(index)}`} className="mention" to={`/${part.slug}`}>
        @{part.name}
      </Link>
    ),
  )
}
