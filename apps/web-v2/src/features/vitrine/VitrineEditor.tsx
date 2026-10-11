/**
 * QUOI     — la vitrine en mode édition : la barre, puis l'en-tête dont chaque élément se modifie
 *            en place (bannière, logo, nom, métier, ville, présentation, liens, adresse).
 * POURQUOI — lot 6b, maquette 2231:2 : on modifie ce qu'on voit. Monté à l'entrée en édition,
 *            démonté à la sortie : le brouillon repart toujours de la vitrine publiée.
 * ATTENTION — tant qu'il y a des changements, quitter la page demande confirmation (onglet fermé,
 *            lien cliqué). Le bouton retour du navigateur, lui, n'est pas intercepté : BrowserRouter
 *            n'offre pas `useBlocker` (arbitrage du plan).
 */
import { BadgeCheck, MapPin } from 'lucide-react'
import { useEffect } from 'react'
import { BIO_MAX } from '@/lib/vitrine-edit'
import { networkCounts } from '@/lib/vitrine'
import { EditableAddress } from './EditableAddress'
import { EditableBanner } from './EditableBanner'
import { EditableLinks } from './EditableLinks'
import { EditableLogo } from './EditableLogo'
import { EditableText } from './EditableText'
import { EditBar } from './EditBar'
import type { Vitrine } from './useVitrine'
import { useVitrineEdit } from './useVitrineEdit'

const LEAVE = 'Abandonner tes modifications ?'

/** Quitter avec des changements : l'onglet qui se ferme, et les liens de la page. */
function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest('a[href]')
      if (!link || link.getAttribute('target') === '_blank') return
      if (window.confirm(LEAVE)) return
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])
}

interface VitrineEditorProps {
  vitrine: Vitrine
  onClose: () => void
  onSaved: (next: Vitrine) => void
}

export function VitrineEditor({ vitrine, onClose, onSaved }: VitrineEditorProps) {
  const edit = useVitrineEdit(vitrine, onSaved)
  const { draft, set } = edit
  const [followers, companions] = networkCounts(vitrine.followerCount, vitrine.companionCount)
  useLeaveGuard(edit.dirty)

  return (
    <>
      <EditBar edit={edit} onClose={onClose} />
      <header className="vitrine-head vitrine-head--editing">
        <EditableBanner
          src={edit.banner?.preview ?? vitrine.bannerUrl}
          position={draft.bannerPosition}
          onPosition={(bannerPosition) => {
            set({ bannerPosition })
          }}
          onPick={edit.pickBanner}
        />

        <div className="vitrine-head__bar">
          <EditableLogo
            src={edit.logo?.preview ?? vitrine.avatarUrl}
            name={draft.name}
            onPick={edit.pickLogo}
          />
        </div>

        <div className="vitrine-head__identity edit-identity">
          <div className="vitrine-head__title-row">
            <EditableText
              className="vitrine-head__name"
              label="Nom de la vitrine"
              value={draft.name}
              maxLength={60}
              onChange={(name) => {
                set({ name })
              }}
            />
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

          <div className="vitrine-head__meta edit-meta">
            <EditableText
              className="vitrine-head__craft"
              label="Métier"
              placeholder="Ton métier"
              value={draft.craft}
              maxLength={60}
              onChange={(craft) => {
                set({ craft })
              }}
            />
            <span className="edit-meta__place">
              <MapPin size={14} strokeWidth={1.8} />
              <EditableText
                className="vitrine-head__place"
                label="Ville"
                placeholder="Ta ville"
                value={draft.city}
                maxLength={60}
                onChange={(city) => {
                  set({ city })
                }}
              />
              <EditableText
                className="vitrine-head__place edit-meta__department"
                label="Département"
                placeholder="69"
                value={draft.department}
                maxLength={3}
                onChange={(department) => {
                  set({ department })
                }}
              />
            </span>
          </div>

          <EditableText
            className="vitrine-head__bio"
            label="Présentation"
            placeholder="Présente ton univers, ton artisanat…"
            value={draft.bio}
            maxLength={BIO_MAX}
            multiline
            counter
            onChange={(bio) => {
              set({ bio })
            }}
          />

          <EditableLinks
            links={draft.links}
            onChange={(links) => {
              set({ links })
            }}
          />

          <EditableAddress
            slug={draft.slug}
            original={edit.original.slug}
            problem={edit.addressProblem}
            onChange={(slug) => {
              set({ slug })
            }}
          />

          <p className="vitrine-head__network edit-muted">
            <span>
              <b>{followers.count}</b> {followers.label}
              <span className="vitrine-head__dot">·</span>
              <b>{companions.count}</b> {companions.label}
            </span>
          </p>
        </div>
      </header>
    </>
  )
}
