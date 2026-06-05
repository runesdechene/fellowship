import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { avatarGradient } from '@/lib/avatar-gradient'
import type { NetworkMember } from '@/lib/profile-network'

interface Props {
  followers: NetworkMember[]
  following: NetworkMember[]
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

type Tab = 'abonnes' | 'abonnements'

/**
 * Modale réseau façon Instagram : deux onglets indépendants — « Abonnés » (qui suit
 * la vitrine) et « Abonnements » (qui la vitrine suit). Un compagnon (follow mutuel)
 * apparaît volontairement dans les deux : ce sont deux relations distinctes.
 */
export function VitrineNetworkModal({ followers, following, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('abonnes')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const list = tab === 'abonnes' ? followers : following
  const emptyLabel = tab === 'abonnes'
    ? 'Pas encore d’abonnés.'
    : 'Ne suit personne pour le moment.'

  return (
    <div className="v-backdrop" onClick={onClose}>
      <div className="v-modal v-net-modal" onClick={e => e.stopPropagation()}>
        <div className="v-mhead">
          <h3>Communauté</h3>
          <button type="button" className="v-mx" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        <div className="v-net-tabs" role="tablist">
          <button
            type="button" role="tab" aria-selected={tab === 'abonnes'}
            className="v-net-tab" onClick={() => setTab('abonnes')}
          >
            Abonnés <span>{followers.length}</span>
          </button>
          <button
            type="button" role="tab" aria-selected={tab === 'abonnements'}
            className="v-net-tab" onClick={() => setTab('abonnements')}
          >
            Abonnements <span>{following.length}</span>
          </button>
        </div>
        <div className="v-mbody v-net-body">
          {list.length === 0
            ? <p className="v-net-empty">{emptyLabel}</p>
            : <div className="v-net-grid">{list.map(m => <MemberRow key={m.id} m={m} onNavigate={onClose} />)}</div>}
        </div>
      </div>
    </div>
  )
}
