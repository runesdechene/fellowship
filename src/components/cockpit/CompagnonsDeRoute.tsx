import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { useCommunityFeed } from '@/hooks/use-community'
import { avatarColor } from '@/lib/community'
import { ShareModal } from '@/components/ShareModal'
import { eventShareUrl, eventPath } from '@/lib/event-link'

export function CompagnonsDeRoute() {
  const { convergences, loading } = useCommunityFeed()
  const [share, setShare] = useState<{ message: string; url: string } | null>(null)

  const visible = convergences.slice(0, 3)
  const extra = convergences.length - visible.length

  return (
    <>
    <div className="ck-card">
      <div className="ck-eyebrow">
        COMPAGNONS
        {convergences.length > 0 && (
          <Link to="/communaute" className="ck-seeall">
            {extra > 0 ? `${convergences.length} ›` : 'tout ›'}
          </Link>
        )}
      </div>

      {loading ? (
        <p className="ck-empty-txt">Chargement…</p>
      ) : convergences.length === 0 ? (
        <p className="ck-empty-txt">
          Suis des compagnons pour voir où ils exposent. <Link to="/communaute">Suggestions →</Link>
        </p>
      ) : (
        <ul className="ck-conv-list">
          {visible.map(c => {
            const url = eventShareUrl({ slug: c.event.slug, id: c.event.id }, window.location.origin)
            const message = `🎪 On sera ${c.count} créateurs réunis à ${c.event.name} ! → ${url}`
            return (
              <li key={c.event.id} className="ck-conv">
                <div className="ck-conv-avs">
                  {c.sample.slice(0, 4).map((a, i) => (
                    <span key={a.actorId} className="ck-av" style={{ background: a.avatarUrl ? 'transparent' : avatarColor(a.label), zIndex: 4 - i }}>
                      {a.avatarUrl ? <img src={a.avatarUrl} alt={a.label} /> : a.label[0]?.toUpperCase()}
                    </span>
                  ))}
                </div>
                <div className="ck-conv-txt">
                  <b>Vous serez {c.count} réunis</b>
                  <small>{c.event.name.toUpperCase()}</small>
                </div>
                <div className="ck-conv-actions">
                  <Link to={eventPath(c.event)} className="ck-btn ck-btn-g ck-btn-sm">Voir</Link>
                  <button type="button" className="ck-btn ck-btn-g ck-btn-sm" onClick={() => setShare({ message, url })} aria-label="Partager"><Share2 strokeWidth={2} /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
    {share && <ShareModal message={share.message} url={share.url} onClose={() => setShare(null)} />}
    </>
  )
}
