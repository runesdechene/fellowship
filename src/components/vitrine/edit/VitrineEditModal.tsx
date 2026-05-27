import { useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'
import type { EntityRow, VitrineLink } from '@/types/database'
import type { VitrineEditApi } from '@/hooks/use-vitrine-edit'

interface Props {
  entity: EntityRow
  api: VitrineEditApi
  onClose: () => void
  onSaved: (patch: Record<string, unknown>) => void
}

export function VitrineEditModal({ entity, api, onClose, onSaved }: Props) {
  const firstLink = ((entity.links as unknown as VitrineLink[]) ?? [])[0]
  const [brand, setBrand] = useState(entity.brand_name)
  const [craft, setCraft] = useState(entity.craft_type ?? '')
  const [city, setCity] = useState(entity.city ?? '')
  const [bio, setBio] = useState(entity.bio ?? '')
  const [link, setLink] = useState(firstLink?.url ?? '')
  const [cover, setCover] = useState(entity.banner_url)
  const [avatar, setAvatar] = useState(entity.avatar_url)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  async function pick(kind: 'cover' | 'avatar', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const url = await api.uploadImage(file, kind)
    if (url) { if (kind === 'cover') setCover(url); else setAvatar(url) }
    if (e.target) e.target.value = ''
  }

  async function save() {
    setError(false)
    setSaving(true)
    const links: VitrineLink[] = link.trim()
      ? [{ type: 'shop', label: 'Boutique', url: /^[a-z]+:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}` }]
      : []
    const patch: Record<string, unknown> = {
      brand_name: brand.trim() || entity.brand_name,
      craft_type: craft.trim() || null,
      city: city.trim() || null,
      bio: bio.trim() || null,
      links,
      banner_url: cover,
      avatar_url: avatar,
    }
    const ok = await api.updateEntity(patch)
    setSaving(false)
    if (ok) { onSaved(patch); onClose() } else { setError(true) }
  }

  return (
    <div className="v-backdrop" onClick={onClose}>
      <div className="v-modal" onClick={e => e.stopPropagation()}>
        <div className="v-mhead">
          <h3>Modifier ma vitrine</h3>
          <button type="button" className="v-mx" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        <div className="v-mbody">
          <div className="v-media">
            <button type="button" className="v-mtile v-mtile-ph" style={avatar ? { backgroundImage: `url(${avatar})` } : undefined} onClick={() => avatarRef.current?.click()}>
              <span className="v-ov"><Camera /></span>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={e => pick('avatar', e)} />
            </button>
            <button type="button" className="v-mtile v-mtile-cv" style={cover ? { backgroundImage: `url(${cover})` } : undefined} onClick={() => coverRef.current?.click()}>
              <span className="v-ov"><Camera /></span>
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={e => pick('cover', e)} />
            </button>
          </div>

          <div className="v-field"><label>Nom de la marque</label><input className="v-inp" value={brand} onChange={e => setBrand(e.target.value)} /></div>
          <div className="v-row2">
            <div className="v-field"><label>Métier</label><input className="v-inp" value={craft} onChange={e => setCraft(e.target.value)} placeholder="Céramiste…" /></div>
            <div className="v-field"><label>Ville</label><input className="v-inp" value={city} onChange={e => setCity(e.target.value)} placeholder="Lyon…" /></div>
          </div>
          <div className="v-field">
            <label>Une phrase qui te résume</label>
            <textarea className="v-inp" maxLength={140} value={bio} onChange={e => setBio(e.target.value)} placeholder="Ton univers en une phrase…" />
            <div className="v-hint"><span>Apparaît sous ton nom.</span><span>{bio.length} / 140</span></div>
          </div>
          <div className="v-field">
            <label>Lien boutique</label>
            <input className="v-inp" value={link} onChange={e => setLink(e.target.value)} placeholder="boutique.monsite.fr" />
            <div className="v-hint"><span>Affiché en vert sous ta phrase.</span></div>
          </div>
        </div>
        <div className="v-mfoot">
          {error && <span className="v-merror">Échec de l'enregistrement — réessaie.</span>}
          <button type="button" className="v-cancel" onClick={onClose}>Annuler</button>
          <button type="button" className="v-save" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}
