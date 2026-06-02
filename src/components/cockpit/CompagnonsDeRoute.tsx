import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Share2 } from 'lucide-react'
import { useCommunityFeed } from '@/hooks/use-community'
import { avatarColor } from '@/lib/community'
import { ShareModal } from '@/components/ShareModal'
import { eventShareUrl } from '@/lib/event-link'

export function CompagnonsDeRoute() {
  const { convergences, loading } = useCommunityFeed()
  const [share, setShare] = useState<{ message: string; url: string } | null>(null)

  return (
    <>
    <div className="ck-card">
      <h3>
        <span className="ck-ic grn"><Users strokeWidth={1.8} /></span>
        Mes compagnons de route
      </h3>

      {loading ? (
        <p className="ck-empty-txt">Chargement…</p>
      ) : convergences.length === 0 ? (
        <p className="ck-empty-txt">
          Suis des compagnons pour voir où ils exposent. <Link to="/communaute">Suggestions →</Link>
        </p>
      ) : (
        <ul className="ck-conv-list">
          {convergences.slice(0, 3).map(c => {
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
                  <small>à {c.event.name}</small>
                </div>
                <div className="ck-conv-actions">
                  <Link to={`/evenement/${c.event.id}`} className="ck-btn ck-btn-g ck-btn-sm">Voir</Link>
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
