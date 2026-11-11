/**
 * QUOI     — la page Messages (maquette Story) : à gauche toutes les conversations — sujets où l'on
 *            a écrit, conversations à deux, groupes —, à droite celle qui est ouverte. Sur
 *            téléphone, la liste ou la conversation, en plein écran.
 * POURQUOI — le tchat remplace WhatsApp : une seule boîte, la plus récente en haut. Un sujet
 *            clôturé y reste lisible.
 * ATTENTION — la page prend tout le contenu, sans barre du haut : sa flèche ramène à la page d'où
 *            l'on vient (`state.from`, que chaque déplacement interne fait suivre).
 *            `/messages/:id` ouvre une conversation : elle a son adresse, le retour du navigateur
 *            revient à la liste. `/messages/nouveau` met « Nouveau message » à la place de la liste.
 */
import { ArrowLeft, PenSquare } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { OfficialBadge } from '@/components/ui/OfficialBadge'
import { useAuth } from '@/lib/auth'
import { othersOf, type InboxRow } from '@/lib/discussion-api'
import { conversationName, messagesExit, previewLine, remainingLabel } from '@/lib/discussions'
import { formatTime, timeAgo } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { Conversation } from './Conversation'
import { NewMessage } from './NewMessage'
import { useInbox } from './useDiscussions'

export function MessagesPage({ composing = false }: { composing?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const state: unknown = useLocation().state

  return (
    <div className={id ? 'messages-page messages-page--open' : 'messages-page'}>
      <section
        className="messages-page__list"
        aria-label={composing ? 'Nouveau message' : 'Conversations'}
      >
        {composing ? <NewMessage /> : <Inbox selected={id} />}
      </section>
      <div className="messages-page__open">
        {id ? (
          <Conversation
            key={id}
            conversationId={id}
            onClose={() => void navigate('/messages', { state })}
            closeWith="arrow"
          />
        ) : (
          <p className="messages-page__placeholder">
            {composing
              ? 'Choisis à qui écrire.'
              : 'Choisis une conversation, ou écris un nouveau message.'}
          </p>
        )}
      </div>
    </div>
  )
}

/** La liste des conversations, la plus récente en haut. */
function Inbox({ selected }: { selected: string | undefined }) {
  const navigate = useNavigate()
  // Messages est venu de la droite : il y repart.
  const go = useTransitionNavigate('messages-close')
  const state: unknown = useLocation().state
  const inbox = useInbox()

  return (
    <>
      <header className="messages-page__head">
        <Button variant="icon" aria-label="Retour" onClick={() => go(messagesExit(state))}>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Button>
        <h1 className="messages-page__title">Messages</h1>
        <Button
          variant="action"
          icon={<PenSquare size={16} strokeWidth={1.75} />}
          onClick={() => void navigate('/messages/nouveau', { state })}
        >
          Nouveau
        </Button>
      </header>
      {inbox.status === 'loading' && <p className="messages-page__status">Chargement…</p>}
      {inbox.status === 'failed' && (
        <p className="messages-page__status">
          Tes conversations ne se chargent pas. Recharge la page.
        </p>
      )}
      {inbox.status === 'ready' && inbox.value.length === 0 && (
        <p className="messages-page__status">
          Aucune conversation pour l’instant. Réponds à un sujet en haut de la page, ou écris à
          quelqu’un.
        </p>
      )}
      {inbox.status === 'ready' && (
        <ul className="messages-page__rows">
          {inbox.value.map((row) => (
            <li key={row.id}>
              <InboxItem
                row={row}
                selected={row.id === selected}
                onOpen={() => void navigate(`/messages/${row.id}`, { state })}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function InboxItem({
  row,
  selected,
  onOpen,
}: {
  row: InboxRow
  selected: boolean
  onOpen: () => void
}) {
  const { actor } = useAuth()
  const others = othersOf(row)
  const now = new Date()
  const last = new Date(row.last_message_at)
  const when = now.toDateString() === last.toDateString() ? formatTime(last) : timeAgo(last, now)
  const sub =
    row.kind === 'sujet'
      ? row.closed_at || new Date(row.expires_at) <= now
        ? 'Sujet clôturé'
        : `Sujet, ${remainingLabel(new Date(row.expires_at), null, now)}`
      : row.kind === 'groupe'
        ? `Groupe de ${String(row.member_count)}`
        : null
  const classes = ['inbox-item']
  if (selected) classes.push('inbox-item--selected')
  if (row.unread > 0) classes.push('inbox-item--unread')

  return (
    <button type="button" className={classes.join(' ')} onClick={onOpen}>
      {row.kind === 'sujet' && row.event_image ? (
        <img className="inbox-item__poster" src={row.event_image} alt="" />
      ) : others.length > 1 ? (
        <AvatarStack>
          {others.slice(0, 2).map((other) => (
            <Avatar
              key={other.id}
              className="inbox-item__avatar inbox-item__avatar--small"
              src={other.avatar}
              name={other.label}
            />
          ))}
        </AvatarStack>
      ) : (
        <Avatar
          className="inbox-item__avatar"
          src={others[0]?.avatar}
          name={others[0]?.label ?? row.mot}
        />
      )}
      <span className="inbox-item__text">
        <span className="inbox-item__line">
          <span className="inbox-item__name">
            {conversationName(row.kind, row.mot, row.title, others)}
            {row.kind === 'direct' && <OfficialBadge actorId={others[0]?.id} />}
          </span>
          <span className="inbox-item__time">{when}</span>
        </span>
        {sub && <span className="inbox-item__sub">{sub}</span>}
        <span className="inbox-item__line">
          <span className="inbox-item__preview">
            {previewLine(
              row.last_body,
              row.last_media_kind,
              row.last_author_label,
              row.last_author === actor?.id,
              row.kind,
            )}
          </span>
          {row.unread > 0 && <span className="inbox-item__unread">{row.unread}</span>}
        </span>
      </span>
    </button>
  )
}
