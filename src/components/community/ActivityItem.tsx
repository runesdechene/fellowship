import { Link } from 'react-router-dom'
import { type FeedItem } from '@/lib/community'
import { eventPath } from '@/lib/event-link'
import { ActorAvatar, ActorName } from './ActorLinks'

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} j`
}

export function ActivityItem({ item, isFollowed, onFollow }: {
  item: FeedItem
  isFollowed?: boolean
  onFollow?: (actorId: string) => void
}) {
  const a = item.actor
  return (
    <div className="act">
      <ActorAvatar actor={a} className="act-av" />
      <div className="act-b">
        {item.kind === 'review' && item.event && (
          <>
            <div className="act-t"><ActorName actor={a} /> a noté{' '}
              <Link to={eventPath(item.event)}>{item.event.name}</Link>{' '}
              <time>· {ago(item.occurredAt)}</time>
            </div>
            <div className="act-stars">{'★'.repeat(item.stars ?? 0)}{'☆'.repeat(5 - (item.stars ?? 0))}
              {item.comment && <span>« {item.comment} »</span>}
            </div>
          </>
        )}
        {item.kind === 'participation' && item.event && (
          <div className="act-t"><ActorName actor={a} /> va à{' '}
            <Link to={eventPath(item.event)}>{item.event.name}</Link>{' '}
            <time>· {ago(item.occurredAt)}</time>
          </div>
        )}
        {item.kind === 'follow' && item.target && (
          <>
            <div className="act-t"><ActorName actor={a} /> suit désormais <ActorName actor={item.target} />{' '}
              <time>· {ago(item.occurredAt)}</time>
            </div>
            {item.target.slug && <div className="act-sub"><Link to={`/${item.target.slug}`}>Voir la vitrine</Link></div>}
          </>
        )}
      </div>
      {item.kind === 'follow' && item.target && onFollow && (
        <button
          className={`btn btn-follow ${isFollowed ? 'is-on' : 'btn-p'}`}
          onClick={() => !isFollowed && onFollow(item.target!.actorId)}
          disabled={isFollowed}
        >
          <span>{isFollowed ? 'Suivi' : 'Suivre'}</span>
        </button>
      )}
    </div>
  )
}
