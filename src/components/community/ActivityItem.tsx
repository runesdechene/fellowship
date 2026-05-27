import { Link } from 'react-router-dom'
import { avatarColor, type FeedItem } from '@/lib/community'

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
      <div className="act-av" style={{ background: avatarColor(a.label) }}>{a.label[0]?.toUpperCase()}</div>
      <div className="act-b">
        {item.kind === 'review' && item.event && (
          <>
            <div className="act-t"><b>{a.label}</b> a noté{' '}
              <Link to={`/evenement/${item.event.id}`}>{item.event.name}</Link>{' '}
              <time>· {ago(item.occurredAt)}</time>
            </div>
            <div className="act-stars">{'★'.repeat(item.stars ?? 0)}{'☆'.repeat(5 - (item.stars ?? 0))}
              {item.comment && <span>« {item.comment} »</span>}
            </div>
          </>
        )}
        {item.kind === 'participation' && item.event && (
          <div className="act-t"><b>{a.label}</b> va à{' '}
            <Link to={`/evenement/${item.event.id}`}>{item.event.name}</Link>{' '}
            <time>· {ago(item.occurredAt)}</time>
          </div>
        )}
        {item.kind === 'follow' && item.target && (
          <>
            <div className="act-t"><b>{a.label}</b> suit désormais <b>{item.target.label}</b>{' '}
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
