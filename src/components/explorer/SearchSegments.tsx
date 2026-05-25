import { useState, useEffect, useRef } from 'react'
import { getTagIcon } from '@/components/ui/TagBadge'
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
  query: string
  userDept: string | null
  onToggleTag: (value: string) => void
  onZone: (zone: Zone) => void
  onPeriod: (period: Period) => void
  onQuery: (query: string) => void
}

type Pop = 'quoi' | 'ou' | 'quand' | null

export function SearchSegments({ tags, selectedTags, zone, period, query, userDept, onToggleTag, onZone, onPeriod, onQuery }: SearchSegmentsProps) {
  const [open, setOpen] = useState<Pop>(null)
  const [searching, setSearching] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const toggle = (p: Pop) => setOpen(o => (o === p ? null : p))
  const enterSearch = () => { setOpen(null); setSearching(true) }
  const exitSearch = () => { onQuery(''); setSearching(false) }

  // Fermer le popover au clic en dehors de la barre de recherche.
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
  const quandLabel = PERIODS.find(p => p.value === period)?.label ?? ''
  return (
    <div className="top" ref={topRef}>
      <div className={'searchbar' + (searching ? ' is-searching' : '')}>
        {searching ? (
          <>
            <span className="seg-search-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
            </span>
            <input
              className="seg-input"
              type="text"
              autoFocus
              value={query}
              placeholder="Rechercher un festival…"
              onChange={e => onQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') exitSearch() }}
            />
            <button className="seg-clear" aria-label="Fermer la recherche" onClick={exitSearch}>
              <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </>
        ) : (
          <>
            <button className={'seg' + (open === 'quoi' ? ' active' : '')} onClick={() => toggle('quoi')}>
              <span className="seg-l">Quoi</span><span className="seg-v">{quoiLabel}</span>
            </button>
            <span className="seg-sep" />
            <button className={'seg' + (open === 'ou' ? ' active' : '')} onClick={() => toggle('ou')}>
              <span className="seg-l">Où</span><span className="seg-v">{ouLabel}</span>
            </button>
            <span className="seg-sep" />
            <button className={'seg' + (open === 'quand' ? ' active' : '')} onClick={() => toggle('quand')}>
              <span className="seg-l">Quand</span><span className="seg-v">{quandLabel}</span>
            </button>
            <button className="seg-search" aria-label="Rechercher" onClick={enterSearch}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
            </button>
          </>
        )}
      </div>

      {open === 'quoi' && (
        <div className="pop open" onClick={e => e.stopPropagation()}>
          <h4>Type de festival</h4>
          <div className="catgrid">
            {tags.map(t => {
              const Icon = getTagIcon(t.value)
              return (
                <button key={t.value} className={'catchip' + (selectedTags.has(t.value) ? ' on' : '')} onClick={() => onToggleTag(t.value)}>
                  <Icon size={14} strokeWidth={2} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {open === 'ou' && (
        <div className="pop open" onClick={e => e.stopPropagation()}>
          <h4>Localisation</h4>
          <div className="peropts">
            <button className={'peropt' + (zone === 'mine' ? ' on' : '')} onClick={() => { onZone('mine'); setOpen(null) }} disabled={!userDept}>
              📍 Mon coin{userDept ? ` (${userDept})` : ''}
            </button>
            <button className={'peropt' + (zone === 'france' ? ' on' : '')} onClick={() => { onZone('france'); setOpen(null) }}>🇫🇷 Toute la France</button>
          </div>
        </div>
      )}

      {open === 'quand' && (
        <div className="pop open" onClick={e => e.stopPropagation()}>
          <h4>Période</h4>
          <div className="peropts">
            {PERIODS.map(p => (
              <button key={p.value} className={'peropt' + (period === p.value ? ' on' : '')} onClick={() => { onPeriod(period === p.value ? 'all' : p.value); setOpen(null) }}>{p.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
