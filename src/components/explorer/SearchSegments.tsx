import { useState, useEffect, useRef } from 'react'
import { getTagEmoji } from '@/components/ui/TagBadge'
import { AddressAutocomplete, type AddressSelection } from '@/components/events/AddressAutocomplete'
import { PERIODS, type Period, type Zone, type GeoFilter } from '@/lib/explorer'

// DynamicTag shape returned by useTags (value = slug, label = display name)
interface DynamicTag {
  value: string
  label: string
  bg: string
  color: string
}

interface SearchSegmentsProps {
  tags: DynamicTag[]
  selectedTags: Set<string>
  zone: Zone
  period: Period
  /** Si défini (arrivée depuis le calendrier), « Quand » affiche ce mois au lieu du preset. */
  monthLabel?: string | null
  /** Filtre géo (Explorer) : localisation + rayon. Si `onGeo` est fourni, « Où » devient
   *  un sélecteur localisation+rayon ; sinon il reste un simple « Toute la France » (Carte). */
  geo?: GeoFilter | null
  onToggleTag: (value: string) => void
  onZone: (zone: Zone) => void
  onPeriod: (period: Period) => void
  onGeo?: (sel: AddressSelection, radiusKm: number) => void
  onRadius?: (km: number) => void
  onClearGeo?: () => void
}

type Pop = 'quoi' | 'ou' | 'quand' | null

/**
 * Barre de filtres Quoi / Où / Quand (chips + popovers centrés sous le chip).
 * Pur filtre : la recherche texte vit ailleurs (SearchBar globale sur l'Explorer).
 */
export function SearchSegments({ tags, selectedTags, zone, period, monthLabel, geo, onToggleTag, onZone, onPeriod, onGeo, onRadius, onClearGeo }: SearchSegmentsProps) {
  const [open, setOpen] = useState<Pop>(null)
  // Ancre du clic-extérieur = le groupe de chips (collé aux boutons), PAS `.top`
  // qui est une bande pleine largeur (cliquer dans son vide à gauche/droite ne
  // fermait pas). Les popovers sont des descendants DOM de .seg-group → un clic
  // dedans ne ferme pas.
  const groupRef = useRef<HTMLDivElement>(null)
  const toggle = (p: Pop) => setOpen(o => (o === p ? null : p))

  // État local du sélecteur de localisation (champ adresse + rayon courant).
  const [addr, setAddr] = useState(geo?.label ?? '')
  const [radius, setRadius] = useState(geo?.radiusKm ?? 50)

  // Fermer le popover au clic en dehors du groupe de chips.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const quoiLabel = selectedTags.size === 0 ? 'Tous les festivals' : `${selectedTags.size} catégorie${selectedTags.size > 1 ? 's' : ''}`
  const ouLabel = geo ? `${geo.label} · ${geo.radiusKm} km` : 'Toute la France'
  const quandLabel = monthLabel ?? (PERIODS.find(p => p.value === period)?.label ?? '')

  const changeRadius = (km: number) => {
    setRadius(km)
    if (geo) onRadius?.(km)
  }
  const clearLocation = () => {
    setAddr('')
    onClearGeo?.()
    onZone('france')
  }

  return (
    <div className="top">
      <div className="searchbar">
        <div className="seg-group" ref={groupRef}>
          <div className="seg-wrap">
            <button className={'seg' + (open === 'quoi' ? ' active' : '')} onClick={() => toggle('quoi')}>
              <span className="seg-l">Quoi</span><span className="seg-v">{quoiLabel}</span>
            </button>
            {open === 'quoi' && (
              <div className="pop open" onClick={e => e.stopPropagation()}>
                <h4>Type de festival</h4>
                <div className="catgrid">
                  {tags.map(t => (
                    <button
                      key={t.value}
                      className={'catchip' + (selectedTags.has(t.value) ? ' on' : '')}
                      onClick={() => onToggleTag(t.value)}
                    >
                      <span aria-hidden="true">{getTagEmoji(t.value)}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="seg-wrap">
            <button className={'seg' + (open === 'ou' ? ' active' : '')} onClick={() => toggle('ou')}>
              <span className="seg-l">Où</span><span className="seg-v">{ouLabel}</span>
            </button>
            {open === 'ou' && (
              <div className="pop open" onClick={e => e.stopPropagation()}>
                <h4>Localisation</h4>
                {onGeo ? (
                  <div className="geo-filter">
                    <AddressAutocomplete
                      value={addr}
                      onChange={setAddr}
                      onSelect={(sel) => onGeo(sel, radius)}
                      inputClass="geo-addr-input"
                    />
                    <label className="geo-radius">
                      <span className="geo-radius-l">Rayon</span>
                      <input
                        type="range" min={5} max={300} step={5}
                        value={radius}
                        onChange={e => changeRadius(Number(e.target.value))}
                      />
                      <b className="geo-radius-v">{radius} km</b>
                    </label>
                    <button className={'peropt' + (!geo ? ' on' : '')} onClick={clearLocation}>🇫🇷 Toute la France</button>
                  </div>
                ) : (
                  <div className="peropts">
                    <button className={'peropt' + (zone === 'france' ? ' on' : '')} onClick={() => { onZone('france'); setOpen(null) }}>🇫🇷 Toute la France</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="seg-wrap">
            <button className={'seg' + (open === 'quand' ? ' active' : '')} onClick={() => toggle('quand')}>
              <span className="seg-l">Quand</span><span className="seg-v">{quandLabel}</span>
            </button>
            {open === 'quand' && (
              <div className="pop open" onClick={e => e.stopPropagation()}>
                <h4>Période</h4>
                <div className="peropts">
                  {PERIODS.map(p => (
                    <button key={p.value} className={'peropt' + (!monthLabel && period === p.value ? ' on' : '')} onClick={() => { onPeriod(!monthLabel && period === p.value ? 'all' : p.value); setOpen(null) }}>{p.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
