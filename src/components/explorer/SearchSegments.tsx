import { useState, useEffect, useRef } from 'react'
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'
import { PERIODS, type Period, type Zone } from '@/lib/explorer'

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
  userDept: string | null
  onToggleTag: (value: string) => void
  onZone: (zone: Zone) => void
  onPeriod: (period: Period) => void
}

type Pop = 'quoi' | 'ou' | 'quand' | null

/**
 * Barre de filtres Quoi / Où / Quand (chips + popovers centrés sous le chip).
 * Pur filtre : la recherche texte vit ailleurs (SearchBar globale sur l'Explorer).
 */
export function SearchSegments({ tags, selectedTags, zone, period, monthLabel, userDept, onToggleTag, onZone, onPeriod }: SearchSegmentsProps) {
  const [open, setOpen] = useState<Pop>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const toggle = (p: Pop) => setOpen(o => (o === p ? null : p))

  // Fermer le popover au clic en dehors de la barre de filtres.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (topRef.current && !topRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const quoiLabel = selectedTags.size === 0 ? 'Tous les festivals' : `${selectedTags.size} catégorie${selectedTags.size > 1 ? 's' : ''}`
  const ouLabel = zone === 'france' ? 'Toute la France' : (userDept ? `Mon coin (${userDept})` : 'Près de moi')
  const quandLabel = monthLabel ?? (PERIODS.find(p => p.value === period)?.label ?? '')

  return (
    <div className="top" ref={topRef}>
      <div className="searchbar">
        <div className="seg-group">
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
                      // Emoji + couleur du même registre que la landing marquee :
                      // currentColor (injecté inline) sert au fond / bordure / texte
                      // via le CSS de .catchip. L'emoji garde ses couleurs Unicode.
                      style={{ color: getTagLandingColor(t.value) }}
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
                <div className="peropts">
                  {/* « Mon coin » masqué tant que le filtre par département n'est pas fiable. */}
                  <button className={'peropt' + (zone === 'france' ? ' on' : '')} onClick={() => { onZone('france'); setOpen(null) }}>🇫🇷 Toute la France</button>
                </div>
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
