import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { avatarGradient } from '@/lib/avatar-gradient'
import type { NetworkMember } from '@/lib/profile-network'

interface Props {
  followers: NetworkMember[]
  friends: NetworkMember[]
  onClose: () => void
}

function MemberRow({ m, onNavigate }: { m: NetworkMember; onNavigate: () => void }) {
  const name = m.brand_name ?? m.display_name ?? 'Exposant'
  const sub = [m.craft_type, m.city].filter(Boolean).join(' · ')
  const inner = (
    <>
      <span className="v-net-av" style={!m.avatar_url ? { background: avatarGradient(name) } : undefined}>
        {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (name[0]?.toUpperCase() ?? '?')}
      </span>
      <span className="v-net-id">
        <b>{name}</b>
        {sub && <span>{sub}</span>}
      </span>
    </>
  )
  return m.public_slug
    ? <Link to={`/${m.public_slug}`} className="v-net-row" onClick={onNavigate}>{inner}</Link>
    : <div className="v-net-row is-static">{inner}</div>
}

/** Modale de découverte : abonnés + compagnons exposants, cliquables vers leur vitrine. */
export function VitrineNetworkModal({ followers, friends, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="v-backdrop" onClick={onClose}>
      <div className="v-modal v-net-modal" onClick={e => e.stopPropagation()}>
        <div className="v-mhead">
          <h3>Communauté</h3>
          <button type="button" className="v-mx" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        <div className="v-mbody v-net-body">
          <div className="v-net-sec">
            <div className="v-net-h">Abonnés <span>{followers.length}</span></div>
            {followers.length === 0
              ? <p className="v-net-empty">Pas encore d'abonnés.</p>
              : followers.map(m => <MemberRow key={`f-${m.id}`} m={m} onNavigate={onClose} />)}
          </div>
          <div className="v-net-sec">
            <div className="v-net-h">Compagnons exposants <span>{friends.length}</span></div>
            {friends.length === 0
              ? <p className="v-net-empty">Pas encore de compagnon exposant.</p>
              : friends.map(m => <MemberRow key={`c-${m.id}`} m={m} onNavigate={onClose} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
