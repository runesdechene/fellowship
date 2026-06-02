import { Link } from 'react-router-dom'
import { Users, Share2 } from 'lucide-react'
import { useCommunityFeed } from '@/hooks/use-community'
import { avatarColor } from '@/lib/community'

export function CompagnonsDeRoute() {
  const { convergences, loading } = useCommunityFeed()

  return (
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
            const shareHref = `https://wa.me/?text=${encodeURIComponent(`${c.event.name} — ${window.location.origin}/evenement/${c.event.id}`)}`
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
                  <a href={shareHref} target="_blank" rel="noopener noreferrer" className="ck-btn ck-btn-g ck-btn-sm"><Share2 strokeWidth={2} /></a>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
