import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCommunityFeed } from '@/hooks/use-community'
import { useMyParticipations } from '@/hooks/use-participations'
import { avatarColor } from '@/lib/community'
import { eventPath } from '@/lib/event-link'

export function CompagnonsV2() {
  const { convergences, loading } = useCommunityFeed()
  const { participations } = useMyParticipations()

  // Ne garder que les convergences sur MES festivals engagés (inscrit / accepté /
  // en attente de paiement), pas les simplement repérés ni dossier en cours.
  const engagedEventIds = useMemo(
    () => new Set(
      participations
        .filter(p => !['interesse', 'refuse', 'en_cours'].includes(p.status as string))
        .map(p => p.event_id),
    ),
    [participations],
  )
  const filtered = useMemo(
    () => convergences.filter(c => engagedEventIds.has(c.event.id)),
    [convergences, engagedEventIds],
  )
  const visible = filtered.slice(0, 5)
  const extra = filtered.length - visible.length

  return (
    <div className="ck2-block">
      <div className="ck2-block-head">
        <h3 className="ck2-h3">Compagnons</h3>
        {filtered.length > 0 && (
          <Link to="/communaute" className="app2-faint">{extra > 0 ? `${filtered.length} ›` : 'tout ›'}</Link>
        )}
      </div>

      {loading ? (
        <p className="app2-muted">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="app2-muted">Suis des compagnons pour voir où ils exposent. <Link to="/communaute">Suggestions →</Link></p>
      ) : (
        <div className="ck2-list">
          {visible.map(c => (
            <Link key={c.event.id} to={eventPath(c.event)} className="ck2-li">
              <span className="ck2-faces">
                {c.sample.slice(0, 3).map((a, i) => (
                  <span key={a.actorId} className="ck2-face"
                    style={{ background: a.avatarUrl ? 'transparent' : avatarColor(a.label), zIndex: 3 - i }}>
                    {a.avatarUrl ? <img src={a.avatarUrl} alt="" /> : a.label[0]?.toUpperCase()}
                  </span>
                ))}
              </span>
              <span className="ck2-txt">
                <span className="ck2-t">Vous serez {c.count} réunis</span>
                <span className="ck2-s">{c.event.name}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
