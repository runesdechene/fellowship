import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useVitrine } from '@/hooks/use-vitrine'
import { useVitrineEdit } from '@/hooks/use-vitrine-edit'
import { useFollowStatus } from '@/hooks/use-follows'
import { useSeasonCompanions } from '@/hooks/use-season-companions'
import { canEditVitrine } from '@/lib/vitrine-edit'
import { splitSeason } from '@/lib/vitrine'
import { VitrineCover } from '@/components/vitrine/VitrineCover'
import { VitrineHeader } from '@/components/vitrine/VitrineHeader'
import { VitrineEscales } from '@/components/vitrine/VitrineEscales'
import { VitrineTampons } from '@/components/vitrine/VitrineTampons'
import { VitrineEmptyRoad } from '@/components/vitrine/VitrineEmptyRoad'
import { VitrineEditModal } from '@/components/vitrine/edit/VitrineEditModal'
import { VitrineQRModal } from '@/components/vitrine/VitrineQRModal'
import { VitrineNetworkModal } from '@/components/vitrine/VitrineNetworkModal'
import { EmbedModal } from '@/components/profile/EmbedModal'
import type { EntityRow } from '@/types/database'
import './Vitrine.css'

interface PublicProfilePageProps { overrideSlug?: string }

export function PublicProfilePage({ overrideSlug }: PublicProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug?.replace(/^@/, '')
  const { currentActor, entities } = useAuth()
  const data = useVitrine(slug)
  const { isFollowing, toggleFollow } = useFollowStatus(data.entity?.actor_id)
  const [showQR, setShowQR] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [showNetwork, setShowNetwork] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const [entity, setEntity] = useState<EntityRow | null>(null)
  const seededFor = useRef<string | null>(null)
  useEffect(() => {
    if (data.entity && seededFor.current !== data.entity.actor_id) {
      seededFor.current = data.entity.actor_id
      setEntity(data.entity) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [data.entity])

  const edit = useVitrineEdit(entity?.actor_id ?? '')
  const { upcoming, past } = splitSeason(data.season, new Date())
  const companions = useSeasonCompanions(upcoming.map(e => e.id))

  if (data.loading) return <div className="profile-loading">Chargement…</div>
  if (data.notFound || !entity) return (
    <div className="profile-not-found">
      <div className="profile-not-found-code">404</div>
      <h1 className="profile-not-found-title">Profil introuvable</h1>
      <p className="profile-not-found-text">Aucun profil ne correspond à <span>@{slug}</span>.</p>
      <Link to="/" className="profile-not-found-link">Retour à l'accueil</Link>
    </div>
  )

  const canEdit = canEditVitrine(entities.map(e => e.actor_id), entity.actor_id)
  const canFollow = !!currentActor && !canEdit

  return (
    <div className="v-page-root">
      <VitrineCover
        url={entity.banner_url}
        position={(entity as { banner_position?: number | null }).banner_position ?? 50}
        canEdit={canEdit}
        onReposition={pos => {
          setEntity(e => (e ? { ...e, banner_position: pos } as EntityRow : e))
          edit.updateEntity({ banner_position: pos })
        }}
      />
      <div className="vitrine">
        <VitrineHeader
          entity={entity} canEdit={canEdit} isFollowing={isFollowing}
          followers={data.followers} friends={data.friends}
          onEdit={() => setEditOpen(true)}
          onOpenSocial={() => setShowNetwork(true)}
          onToggleFollow={canFollow ? toggleFollow : undefined}
          onShare={() => { navigator.share?.({ url: window.location.href }).catch(() => {}) }}
          onQR={() => setShowQR(true)}
        />
        {upcoming.length === 0 && past.length === 0 ? (
          <VitrineEmptyRoad canEdit={canEdit} />
        ) : (
          <>
            <VitrineEscales events={upcoming} companions={companions} onEmbed={canEdit ? () => setShowEmbed(true) : undefined} />
            <VitrineTampons events={past} />
          </>
        )}
        <div className="v-footer">
          <span className="v-footer-mark">✦</span>
          Carnet de route Fellowship{entity.public_slug ? <> · <code>flw.sh/{entity.public_slug}</code></> : null}
        </div>
      </div>

      {editOpen && <VitrineEditModal entity={entity} api={edit} onClose={() => setEditOpen(false)} onSaved={patch => setEntity(e => (e ? { ...e, ...patch } as EntityRow : e))} />}
      {showNetwork && <VitrineNetworkModal followers={data.followers} friends={data.friends} onClose={() => setShowNetwork(false)} />}
      {showQR && entity.public_slug && <VitrineQRModal slug={entity.public_slug} onClose={() => setShowQR(false)} />}
      {showEmbed && entity.public_slug && <EmbedModal slug={entity.public_slug} onClose={() => setShowEmbed(false)} />}
    </div>
  )
}
