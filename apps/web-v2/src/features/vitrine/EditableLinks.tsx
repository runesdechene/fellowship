/**
 * QUOI     — les liens de la vitrine en mode édition : trois au plus (site, Instagram, boutique),
 *            chacun avec son icône, un × pour le retirer, « + Ajouter un lien » sous trois.
 * POURQUOI — lot 6b (Uriel, 11/10/2026) : Instagram est la vraie vitrine de beaucoup d'artisans.
 * ATTENTION — le type se déduit de l'adresse à la sortie du champ (linkType), et `https://` est
 *            ajouté s'il manque (normalizeUrl) : l'artisan tape « monsite.fr ».
 */
import { Globe, Plus, ShoppingBag, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { InstagramIcon } from '@/components/ui/InstagramIcon'
import {
  MAX_LINKS,
  linkLabel,
  linkType,
  normalizeUrl,
  type LinkType,
  type VitrineLink,
} from '@/lib/vitrine-edit'

const ICONS: Record<LinkType, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  website: Globe,
  instagram: InstagramIcon,
  shop: ShoppingBag,
}

interface EditableLinksProps {
  links: VitrineLink[]
  onChange: (links: VitrineLink[]) => void
}

export function EditableLinks({ links, onChange }: EditableLinksProps) {
  function update(index: number, url: string) {
    onChange(links.map((link, at) => (at === index ? { ...link, url } : link)))
  }

  function settle(index: number) {
    const link = links[index]
    if (!link) return
    const url = normalizeUrl(link.url)
    if (url === '') {
      onChange(links.filter((_, at) => at !== index))
      return
    }
    const type = linkType(url)
    onChange(
      links.map((item, at) =>
        at === index ? { type, url, label: linkLabel({ type, url, label: '' }) } : item,
      ),
    )
  }

  return (
    <span className="edit-zone edit-links">
      {links.map((link, index) => {
        const Icon = ICONS[link.type]
        return (
          <span key={index} className="edit-links__row">
            <Icon size={14} strokeWidth={1.9} />
            <input
              className="vitrine-head__site edit-field edit-links__input"
              type="url"
              aria-label="Adresse du lien"
              placeholder="monsite.fr, instagram.com/…"
              autoFocus={link.url === ''}
              value={link.url}
              onChange={(event) => {
                update(index, event.target.value)
              }}
              onBlur={() => {
                settle(index)
              }}
            />
            <button
              type="button"
              className="edit-links__remove"
              aria-label={`Retirer ${linkLabel(link) || 'ce lien'}`}
              onClick={() => {
                onChange(links.filter((_, at) => at !== index))
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        )
      })}
      {links.length < MAX_LINKS && (
        <button
          type="button"
          className="edit-links__add"
          onClick={() => {
            onChange([...links, { type: 'website', url: '', label: '' }])
          }}
        >
          <Plus size={13} strokeWidth={2} />
          Ajouter un lien
        </button>
      )}
    </span>
  )
}
