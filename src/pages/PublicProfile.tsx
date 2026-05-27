import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useVitrine } from '@/hooks/use-vitrine'
import { useVitrineEdit } from '@/hooks/use-vitrine-edit'
import { useFollowStatus } from '@/hooks/use-follows'
import { VitrineCover } from '@/components/vitrine/VitrineCover'
import { VitrineHeader } from '@/components/vitrine/VitrineHeader'
import { VitrineStats } from '@/components/vitrine/VitrineStats'
import { VitrineGallery } from '@/components/vitrine/VitrineGallery'
import { VitrineLinks } from '@/components/vitrine/VitrineLinks'
import { VitrineSeason } from '@/components/vitrine/VitrineSeason'
import { InlineText } from '@/components/vitrine/edit/InlineText'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { EmbedModal } from '@/components/profile/EmbedModal'
import type { EntityRow, EntityGalleryRow, VitrineLink } from '@/types/database'
import './Vitrine.css'

interface PublicProfilePageProps { overrideSlug?: string }

export function PublicProfilePage({ overrideSlug }: PublicProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug?.replace(/^@/, '')
  const { currentActor } = useAuth()
  const data = useVitrine(slug)
  const { isFollowing, toggleFollow } = useFollowStatus(data.entity?.actor_id)
  const [showQR, setShowQR] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [editing, setEditing] = useState(false)

  // Copie locale optimiste (seedée depuis le hook de lecture)
  const [entity, setEntity] = useState<EntityRow | null>(null)
  const [gallery, setGallery] = useState<EntityGalleryRow[]>([])
  useEffect(() => { setEntity(data.entity) }, [data.entity]) // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setGallery(data.gallery) }, [data.gallery]) // eslint-disable-line react-hooks/set-state-in-effect

  const edit = useVitrineEdit(entity?.actor_id ?? '')

  if (data.loading) return <div className="profile-loading">Chargement…</div>
  if (data.notFound || !entity) return (
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

  // Helpers de mise à jour locale + persistance
  const patchEntity = (patch: Record<string, unknown>) => {
    setEntity(e => (e ? { ...e, ...patch } as EntityRow : e))
    edit.updateEntity(patch)
  }
  const uploadCover = async (file: File) => {
    const url = await edit.uploadImage(file, 'cover')
    if (url) patchEntity({ banner_url: url })
  }
  const uploadAvatar = async (file: File) => {
    const url = await edit.uploadImage(file, 'avatar')
    if (url) patchEntity({ avatar_url: url })
  }
  const addPhotos = async (files: File[]) => {
    const rows = await edit.addGalleryImages(files, gallery.length)
    if (rows.length) setGallery(g => [...g, ...rows])
  }
  const removePhoto = async (id: string) => {
    const prev = gallery
    setGallery(g => g.filter(p => p.id !== id))
    const ok = await edit.removeGalleryImage(id)
    if (!ok) setGallery(prev)
  }
  const reorderPhotos = (orderedIds: string[]) => {
    setGallery(g => orderedIds.map(id => g.find(p => p.id === id)!).filter(Boolean))
    edit.reorderGallery(orderedIds)
  }

  return (
    <div className="v-page-root">
      <VitrineCover url={entity.banner_url} editing={editing} onUpload={uploadCover} />
      <div className="vitrine">
        {isOwner && (
          <div className="v-edit-bar">
            <button type="button" className={`v-btn ${editing ? 'v-btn-p' : ''}`} onClick={() => setEditing(v => !v)}>
              {editing ? <><Check /> Terminé</> : <><Pencil /> Modifier ma vitrine</>}
            </button>
            {edit.status === 'saving' && <span className="v-save-pill">Enregistrement…</span>}
            {edit.status === 'saved' && <span className="v-save-pill is-ok">✓ Enregistré</span>}
            {edit.status === 'error' && <span className="v-save-pill is-err">Échec — réessaie</span>}
          </div>
        )}

        <VitrineHeader
          entity={entity} isOwner={isOwner} isFollowing={isFollowing}
          onToggleFollow={canFollow ? toggleFollow : undefined}
          onShare={() => { navigator.share?.({ url: window.location.href }).catch(() => {}) }}
          onQR={() => setShowQR(true)}
          editing={editing} onField={patchEntity} onAvatar={uploadAvatar}
        />
        <VitrineStats followers={data.followers} friends={data.friends} seasonCount={data.season.length} year={year} />

        <div className="v-grid">
          <div className="v-col-main">
            {(entity.bio || editing) && (
              <div className="v-card v-about">
                <h2>À propos</h2>
                {editing ? (
                  <InlineText value={entity.bio ?? ''} multiline placeholder="Présente ton univers, ton artisanat…" onCommit={v => patchEntity({ bio: v || null })}>
                    <p>{entity.bio || <span className="v-edit-empty">+ Ajouter une présentation</span>}</p>
                  </InlineText>
                ) : <p>{entity.bio}</p>}
              </div>
            )}
            <VitrineGallery photos={gallery} editing={editing} onAdd={addPhotos} onRemove={removePhoto} onReorder={reorderPhotos} />
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
            <VitrineLinks links={links} editing={editing} onChange={next => patchEntity({ links: next })} />
            <VitrineSeason season={data.season} />
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
