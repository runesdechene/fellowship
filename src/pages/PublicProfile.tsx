import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useVitrine } from '@/hooks/use-vitrine'
import { useFollowStatus } from '@/hooks/use-follows'
import { VitrineCover } from '@/components/vitrine/VitrineCover'
import { VitrineHeader } from '@/components/vitrine/VitrineHeader'
import { VitrineStats } from '@/components/vitrine/VitrineStats'
import { VitrineGallery } from '@/components/vitrine/VitrineGallery'
import { VitrineLinks } from '@/components/vitrine/VitrineLinks'
import { VitrineSeason } from '@/components/vitrine/VitrineSeason'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { EmbedModal } from '@/components/profile/EmbedModal'
import type { VitrineLink } from '@/types/database'
import './Vitrine.css'

interface PublicProfilePageProps {
  overrideSlug?: string
}

export function PublicProfilePage({ overrideSlug }: PublicProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug?.replace(/^@/, '')
  const { currentActor } = useAuth()
  const { entity, gallery, season, friends, followers, loading, notFound } = useVitrine(slug)
  const { isFollowing, toggleFollow } = useFollowStatus(entity?.actor_id)
  const [showQR, setShowQR] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)

  if (loading) return <div className="profile-loading">Chargement…</div>
  if (notFound || !entity) return (
    <div className="profile-not-found">
      <div className="profile-not-found-code">404</div>
      <h1 className="profile-not-found-title">Profil introuvable</h1>
      <p className="profile-not-found-text">Aucun profil ne correspond à <span>@{slug}</span>.</p>
      <Link to="/" className="profile-not-found-link">Retour à l'accueil</Link>
    </div>
  )

  const isOwner = currentActor?.id === entity.actor_id
  const canFollow = !!currentActor && !isOwner
  const links = (entity.links as unknown as VitrineLink[]) ?? []
  const year = new Date().getFullYear()

  return (
    <div className="v-page-root">
      <VitrineCover url={entity.banner_url} />
      <div className="vitrine">
        <VitrineHeader
          entity={entity}
          isOwner={isOwner}
          isFollowing={isFollowing}
          onToggleFollow={canFollow ? toggleFollow : undefined}
          onShare={() => { navigator.share?.({ url: window.location.href }).catch(() => {}) }}
          onQR={() => setShowQR(true)}
        />
        <VitrineStats followers={followers} friends={friends} seasonCount={season.length} year={year} />

        <div className="v-grid">
          <div className="v-col-main">
            {entity.bio && (
              <div className="v-card v-about">
                <h2>À propos</h2>
                <p>{entity.bio}</p>
              </div>
            )}
            <VitrineGallery photos={gallery} />
            {canFollow && !isFollowing && (
              <div className="v-nudge">
                <span className="v-nudge-ic">🔔</span>
                <div className="v-nudge-t">
                  <b>Ne rate plus ses dates</b>
                  <span>Suis {entity.brand_name} pour être prévenu de ses prochains festivals.</span>
                </div>
                <button className="v-btn v-btn-p" onClick={toggleFollow}>Suivre</button>
              </div>
            )}
          </div>
          <aside className="v-col-side">
            <VitrineLinks links={links} />
            <VitrineSeason season={season} />
          </aside>
        </div>

        <div className="v-footer">
          <span className="v-footer-mark">✦</span>
          Vitrine Fellowship{entity.public_slug ? <> · <code>flw.sh/{entity.public_slug}</code></> : null}
        </div>
      </div>

      {showQR && entity.public_slug && <QRCodeModal slug={entity.public_slug} onClose={() => setShowQR(false)} />}
      {showEmbed && entity.public_slug && <EmbedModal slug={entity.public_slug} onClose={() => setShowEmbed(false)} />}
    </div>
  )
}
