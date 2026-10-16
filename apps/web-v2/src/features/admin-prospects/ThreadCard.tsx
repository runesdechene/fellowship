/**
 * QUOI     — le bloc « Échanges » de la page d'un prospect : ses e-mails et les nôtres, dans l'ordre.
 * POURQUOI — le prospectant voit tout le fil avant d'écrire (maquette 2355:2) : les nôtres à droite,
 *            les siens à gauche, avec la date et l'état de livraison.
 * ATTENTION — le pied de désinscription ajouté à l'envoi n'est pas répété dans le fil.
 */
import { Link2 } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { formatDayMonthShort, formatTime } from '@/lib/dates'
import type { ThreadMessage } from './useProspect'

const DELIVERY: Record<string, string> = {
  delivre: 'délivré',
  rebond: 'rebond',
  plainte: 'signalé comme spam',
}

/** Le texte écrit, sans le pied « — Tu ne veux plus recevoir nos e-mails ? » ajouté à l'envoi. */
function writtenPart(body: string): string {
  return body.split('\n\n—\n')[0] ?? body
}

function meta(message: ThreadMessage): string {
  const date = new Date(message.at)
  return [
    message.sender_name ?? message.from_email,
    message.from_email,
    `${formatDayMonthShort(date)}, ${formatTime(date)}`,
    message.delivery ? DELIVERY[message.delivery] : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function ThreadCard({ messages }: { messages: ThreadMessage[] }) {
  const count =
    messages.length === 0
      ? 'Aucun échange'
      : messages.length === 1
        ? '1 message'
        : `${messages.length} messages`
  return (
    <AdminCard
      title="Échanges"
      Icon={Link2}
      tone="bleu"
      action={<span className="prospect-thread__count">{count}</span>}
    >
      {messages.length === 0 ? (
        <p className="prospect-thread__empty">
          Aucun e-mail pour l’instant. Choisis un modèle de premier contact ci-dessous.
        </p>
      ) : (
        <ol className="prospect-thread">
          {messages.map((message, index) => (
            <li
              key={message.id}
              className={`prospect-thread__message prospect-thread__message--${message.direction === 'in' ? 'in' : 'out'}`}
            >
              <p className="prospect-thread__meta">{meta(message)}</p>
              {index === 0 && message.subject && (
                <p className="prospect-thread__subject">{message.subject}</p>
              )}
              <p className="prospect-thread__body">{writtenPart(message.body_text)}</p>
              {message.has_attachments && (
                <p className="prospect-thread__meta">Pièce jointe non affichée.</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </AdminCard>
  )
}
