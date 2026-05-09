import { useState, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useEvents } from '@/hooks/use-events'
import { useAuth } from '@/lib/auth'
import { EventCard } from '@/components/events/EventCard'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { applyViewMode, VIEW_MODES, type ViewMode } from '@/lib/explorer'
import './Explorer.css'

const MODE_LABELS: Record<ViewMode, string> = {
  upcoming: 'Bientôt',
  recent: 'Récents',
  all: 'Tous',
}

export function ExplorerPage() {
  const { profile } = useAuth()
  const { events: allEvents, loading } = useEvents()
  const { tags: dynamicTags } = useTags()

  // Persist filters in localStorage
  const stored = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('explorer-filters') ?? '{}') } catch { return {} }
  }, [])
  const persist = useCallback((patch: Record<string, unknown>) => {
    try {
      const cur = JSON.parse(localStorage.getItem('explorer-filters') ?? '{}')
      localStorage.setItem('explorer-filters', JSON.stringify({ ...cur, ...patch }))
    } catch { /* ignore */ }
  }, [])

  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set(stored.tags ?? []))
  const [filterDept, setFilterDept] = useState(() => stored.dept === true)
  const [mode, setMode] = useState<ViewMode>(() =>
    (VIEW_MODES as readonly string[]).includes(stored.mode) ? stored.mode : 'upcoming'
  )

  // Month pickers
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(currentYear, currentMonth + i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }
  })
  const validMonths = new Set(monthOptions.map(o => o.value))
  const [monthFrom, setMonthFrom] = useState(() => validMonths.has(stored.monthFrom) ? stored.monthFrom : monthOptions[0].value)
  const monthOptionsTo = [...monthOptions.filter(o => o.value > monthFrom), { value: '9999-12', label: 'la fin des temps' }]
  const [monthTo, setMonthTo] = useState(() => stored.monthTo === '9999-12' || validMonths.has(stored.monthTo) ? stored.monthTo : '9999-12')

  const now = useMemo(() => new Date(), [])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      persist({ tags: [...next] })
      return next
    })
  }

  const changeMode = (next: ViewMode) => {
    setMode(next)
    persist({ mode: next })
  }

  // ---------- filtered events (tags / dept / month range) ----------
  const filteredEvents = useMemo(() => {
    let result = allEvents

    if (selectedTags.size > 0) {
      result = result.filter(ev => ev.tags?.some(t => selectedTags.has(t)))
    }

    if (filterDept && profile?.department) {
      result = result.filter(ev => ev.department === profile.department)
    }

    const fromDate = new Date(monthFrom + '-01')
    const toDate = new Date(monthTo + '-01')
    toDate.setMonth(toDate.getMonth() + 1)
    result = result.filter(ev => {
      const d = new Date(ev.start_date)
      return d >= fromDate && d < toDate
    })

    // Default sort: start_date asc (chronological)
    return [...result].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, selectedTags, filterDept, monthFrom, monthTo])

  // ---------- apply view mode (filter + sort) on top of filteredEvents ----------
  const displayedEvents = useMemo(
    () => applyViewMode(filteredEvents, mode, now),
    [filteredEvents, mode, now]
  )

  return (
    <div className="explorer-page">
      {/* Header */}
      <div className="explorer-mode-bar">
        <h1 className="page-title">Explorer</h1>
      </div>

      {/* Filter bar (tags + months + dept) */}
      <div className="explorer-filters">
        {dynamicTags.map(tag => {
          const colors = { bg: tag.bg, color: tag.color }
          const isActive = selectedTags.has(tag.value)
          const Icon = getTagIcon(tag.value)
          return (
            <button
              key={tag.value}
              onClick={() => toggleTag(tag.value)}
              className="explorer-filter-chip"
              style={isActive
                ? { background: colors.color, color: 'white' }
                : { background: colors.bg, color: colors.color }
              }
            >
              <Icon size={14} strokeWidth={2} />
              {tag.label}
            </button>
          )
        })}

        <div className="explorer-filter-divider" />

        <span className="explorer-month-pickers-label">De</span>
        <MonthPicker
          options={monthOptions}
          value={monthFrom}
          onChange={v => {
            setMonthFrom(v)
            persist({ monthFrom: v })
            if (v >= monthTo) {
              const newTo = monthOptions[Math.min(monthOptions.findIndex(o => o.value === v) + 1, monthOptions.length - 1)].value
              setMonthTo(newTo)
              persist({ monthTo: newTo })
            }
          }}
        />
        <span className="explorer-month-pickers-label">à</span>
        <MonthPicker
          options={monthOptionsTo}
          value={monthTo}
          onChange={v => { setMonthTo(v); persist({ monthTo: v }) }}
        />

        {profile?.department && (
          <>
            <div className="explorer-filter-divider" />
            <button
              onClick={() => { setFilterDept(v => { persist({ dept: !v }); return !v }) }}
              className={`explorer-filter-chip ${filterDept ? 'active' : ''}`}
            >
              Dept. {profile.department}
            </button>
          </>
        )}
      </div>

      {/* Mode segmented control */}
      <div className="explorer-mode-segmented" role="group" aria-label="Mode d'affichage">
        {VIEW_MODES.map(m => (
          <button
            key={m}
            aria-pressed={mode === m}
            className={`explorer-mode-btn${mode === m ? ' active' : ''}`}
            onClick={() => changeMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="explorer-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="explorer-grid-skeleton animate-pulse" />
          ))}
        </div>
      )}

      {/* Grid or empty state */}
      {!loading && displayedEvents.length > 0 && (
        <div className="explorer-grid">
          {displayedEvents.map(ev => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}

      {!loading && displayedEvents.length === 0 && (
        <div className="explorer-empty">
          <Search strokeWidth={1.5} />
          <div className="explorer-empty-title">Aucun événement ne correspond</div>
          <div className="explorer-empty-text">Essaie d'élargir tes filtres (tags, plage de mois, département).</div>
        </div>
      )}
    </div>
  )
}
