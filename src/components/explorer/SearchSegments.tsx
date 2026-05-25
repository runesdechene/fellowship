import { useState } from 'react'
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
  userDept: string | null
  onToggleTag: (value: string) => void
  onZone: (zone: Zone) => void
  onPeriod: (period: Period) => void
}

type Pop = 'quoi' | 'ou' | 'quand' | null

export function SearchSegments({ tags, selectedTags, zone, period, userDept, onToggleTag, onZone, onPeriod }: SearchSegmentsProps) {
  const [open, setOpen] = useState<Pop>(null)
  const toggle = (p: Pop) => setOpen(o => (o === p ? null : p))
  const quoiLabel = selectedTags.size === 0 ? 'Tous les festivals' : `${selectedTags.size} catégorie${selectedTags.size > 1 ? 's' : ''}`
  const ouLabel = zone === 'france' ? 'Toute la France' : (userDept ? `Mon coin (${userDept})` : 'Près de moi')
  const quandLabel = PERIODS.find(p => p.value === period)?.label ?? ''
  return (
    <div className="top">
      <div className="searchbar">
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
        <button className="seg-search" aria-label="Fermer" onClick={() => setOpen(null)}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
        </button>
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
            <button className={'peropt' + (zone === 'mine' ? ' on' : '')} onClick={() => onZone('mine')} disabled={!userDept}>
              📍 Mon coin{userDept ? ` (${userDept})` : ''}
            </button>
            <button className={'peropt' + (zone === 'france' ? ' on' : '')} onClick={() => onZone('france')}>🇫🇷 Toute la France</button>
          </div>
        </div>
      )}

      {open === 'quand' && (
        <div className="pop open" onClick={e => e.stopPropagation()}>
          <h4>Période</h4>
          <div className="peropts">
            {PERIODS.map(p => (
              <button key={p.value} className={'peropt' + (period === p.value ? ' on' : '')} onClick={() => onPeriod(p.value)}>{p.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
