/**
 * QUOI     — le haut de la vitrine : la bannière, le logo à cheval, le nom en serif, les badges,
 *            le métier et la ville, la présentation, le site, le réseau, et les actions.
 * POURQUOI — c'est la carte de visite de l'artisan : ce qu'un organisateur ou un exposant voit en
 *            premier.
 * ATTENTION — le propriétaire ne se suit pas lui-même : il voit « Modifier ma vitrine », qui mène
 *            à l'éditeur de la V1 tant que la V2 n'a pas le sien.
 */
import { BadgeCheck, Check, ExternalLink, MapPin, Pencil, Plus, Share } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { initials, networkCounts, websiteLink } from '@/lib/vitrine'
import type { Vitrine } from './useVitrine'

interface VitrineHeadProps {
  vitrine: Vitrine
  isOwner: boolean
  onToggleFollow: () => void
}

/** L'adresse publique de la vitrine : celle de la V1, à la racine du domaine. */
function publicUrl(slug: string): string {
  return `${window.location.origin}/${slug}`
}

export function VitrineHead({ vitrine, isOwner, onToggleFollow }: VitrineHeadProps) {
  const [copied, setCopied] = useState(false)
  const [followers, companions] = networkCounts(vitrine.followerCount, vitrine.companionCount)
  const site = vitrine.website ? websiteLink(vitrine.website) : null

  async function share() {
    const url = publicUrl(vitrine.slug)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: vitrine.name, url })
      } catch {
        /* partage annulé : rien à faire */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      /* presse-papiers refusé : le lien reste lisible au pied de page */
    }
  }

  return (
    <header className="vitrine-head">
      <div className="vitrine-head__banner">
        {vitrine.bannerUrl && (
          <img
            className="vitrine-head__banner-image"
            src={vitrine.bannerUrl}
            alt=""
            style={{ '--banner-y': `${vitrine.bannerPosition}%` } as CSSProperties}
          />
        )}
      </div>

      <div className="vitrine-head__bar">
        <div className="vitrine-head__logo">
          {vitrine.avatarUrl ? (
            <Avatar
              className="vitrine-head__logo-image"
              src={vitrine.avatarUrl}
              name={vitrine.name}
            />
          ) : (
            <span className="vitrine-head__initials">{initials(vitrine.name)}</span>
          )}
        </div>

        <div className="vitrine-head__actions">
          {isOwner ? (
            <a className="button button--action" href={publicUrl(vitrine.slug)}>
              <Pencil size={16} strokeWidth={2} />
              Modifier ma vitrine
            </a>
          ) : (
            <Button
              variant="action"
              icon={
                vitrine.following ? (
                  <Check size={16} strokeWidth={2.2} />
                ) : (
                  <Plus size={16} strokeWidth={2.2} />
                )
              }
              aria-pressed={vitrine.following}
              onClick={onToggleFollow}
            >
              {vitrine.following ? 'Suivi' : 'Suivre'}
            </Button>
          )}
          <Button
            variant="icon"
            aria-label="Partager la vitrine"
            title={copied ? 'Lien copié' : 'Partager'}
            onClick={() => {
              void share()
            }}
          >
            {copied ? <Check size={18} strokeWidth={2} /> : <Share size={18} strokeWidth={1.8} />}
          </Button>
        </div>
      </div>

      <div className="vitrine-head__identity">
        <div className="vitrine-head__title-row">
          <h1 className="vitrine-head__name">{vitrine.name}</h1>
          {vitrine.certified && (
            <span className="vitrine-badge">
              <BadgeCheck size={14} strokeWidth={2} />
              Certifié
            </span>
          )}
          {vitrine.ambassador && (
            <span className="vitrine-badge vitrine-badge--soft">Ambassadeur</span>
          )}
        </div>

        {(vitrine.craft ?? vitrine.place) && (
          <p className="vitrine-head__meta">
            {vitrine.craft && <span className="vitrine-head__craft">{vitrine.craft}</span>}
            {vitrine.craft && vitrine.place && <span className="vitrine-head__dot">·</span>}
            {vitrine.place && (
              <span className="vitrine-head__place">
                <MapPin size={14} strokeWidth={1.8} />
                {vitrine.place}
              </span>
            )}
          </p>
        )}

        {vitrine.bio && <p className="vitrine-head__bio">{vitrine.bio}</p>}

        {site && (
          <a className="vitrine-head__site" href={site.href} target="_blank" rel="noreferrer">
            {site.label}
            <ExternalLink size={13} strokeWidth={2} />
          </a>
        )}

        <div className="vitrine-head__network">
          {vitrine.followerFaces.length > 0 && (
            <AvatarStack>
              {vitrine.followerFaces.map((face) => (
                <Avatar
                  key={face.id}
                  className="vitrine-head__face"
                  src={face.avatarUrl}
                  name={face.name}
                />
              ))}
            </AvatarStack>
          )}
          <span>
            <b>{followers.count}</b> {followers.label}
            <span className="vitrine-head__dot">·</span>
            <b>{companions.count}</b> {companions.label}
          </span>
        </div>
      </div>
    </header>
  )
}
