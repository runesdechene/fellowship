/**
 * QUOI     — l'icône Messages de la barre du haut, à côté de la cloche, avec le nombre de messages
 *            non lus (hors conversations en sourdine).
 * POURQUOI — la boîte Messages s'ouvre de partout, comme la cloche (maquette Story).
 */
import { MessageCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useTransitionNavigate } from '@/lib/navigation'
import { useInbox } from './useDiscussions'

export function MessagesButton() {
  const go = useTransitionNavigate()
  const { pathname, search } = useLocation()
  const inbox = useInbox()
  const unread =
    inbox.status === 'ready'
      ? inbox.value.reduce((total, row) => total + (row.muted ? 0 : row.unread), 0)
      : 0
  return (
    <span className="messages-button">
      <Button
        variant="icon"
        aria-label={unread > 0 ? `Messages, ${String(unread)} non lus` : 'Messages'}
        title="Messages"
        onClick={() => go('/messages', { state: { from: pathname + search } })}
      >
        <MessageCircle size={20} strokeWidth={1.75} />
      </Button>
      {unread > 0 && (
        <span className="messages-button__count" aria-hidden="true">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </span>
  )
}
