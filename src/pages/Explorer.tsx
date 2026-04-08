import { useState, useMemo, useCallback } from 'react'
import { useEvents } from '@/hooks/use-events'
import { useAuth } from '@/lib/auth'
import { EventCard } from '@/components/events/EventCard'
import { SlideRow } from '@/components/events/SlideRow'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import { Plus } from 'lucide-react'
import { MonthPicker } from '@/components/ui/MonthPicker'
import type { EventWithScore } from '@/types/database'
import './Explorer.css'

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

  // ---------- filtered events ----------
  const filteredEvents = useMemo(() => {
    let result = allEvents

    // Tag filter
    if (selectedTags.size > 0) {
      result = result.filter(ev => ev.tags?.some(t => selectedTags.has(t)))
    }

    // Department filter
    if (filterDept && profile?.department) {
      result = result.filter(ev => ev.department === profile.department)
    }

    // Month range filter
    const fromDate = new Date(monthFrom + '-01')
    const toDate = new Date(monthTo + '-01')
    toDate.setMonth(toDate.getMonth() + 1)
    result = result.filter(ev => {
      const d = new Date(ev.start_date)
      return d >= fromDate && d < toDate
    })

    // Sort by start_date ascending
    return [...result].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, selectedTags, filterDept, monthFrom, monthTo])

  // ---------- sections ----------
  const nearbyEvents = useMemo(() =>
    profile?.department ? filteredEvents.filter(ev => ev.department === profile.department && new Date(ev.start_date) >= now) : [],
  [filteredEvents, profile?.department, now])

  const upcomingEvents = useMemo(() =>
    filteredEvents.filter(ev => new Date(ev.start_date) >= now),
  [filteredEvents, now])

  const recentEvents = useMemo(() =>
    [...filteredEvents].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  [filteredEvents])

  const renderCard = (ev: EventWithScore) => (
    <div key={ev.id} className="flex-shrink-0 w-[200px]">
      <EventCard event={ev} />
    </div>
  )

  return (
    <div className="explorer-page">
      {/* Header */}
      <div className="explorer-mode-bar">
        <h1 className="page-title">Explorer</h1>
      </div>

      {/* Filter bar */}
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

      {/* Loading */}
      {loading && (
        <div style={{ padding: '0 24px' }}>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-shrink-0 w-[200px] rounded-2xl bg-card animate-pulse" style={{ aspectRatio: '2/3' }} />
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      {!loading && (
        <>
          <SlideRow
            title={profile?.department ? `Dans votre département (${profile.department})` : 'Dans votre département'}
            count={nearbyEvents.length}
          >
            {nearbyEvents.map(renderCard)}
            <div key="add-card" className="flex-shrink-0 w-[200px]">
              <button
                onClick={() => {
                  const fab = document.querySelector('.fab-button') as HTMLButtonElement
                  fab?.click()
                }}
                className="explorer-add-card"
              >
                <div className="explorer-add-card-icon">
                  <Plus strokeWidth={1.5} />
                </div>
                <span className="explorer-add-card-text">Ajouter un événement</span>
              </button>
            </div>
          </SlideRow>

          {upcomingEvents.length > 0 && (
            <SlideRow title="Bientôt" count={upcomingEvents.length}>
              {upcomingEvents.map(renderCard)}
            </SlideRow>
          )}

          {recentEvents.length > 0 && (
            <SlideRow title="Ajoutés récemment" count={recentEvents.length}>
              {recentEvents.map(renderCard)}
            </SlideRow>
          )}
        </>
      )}
    </div>
  )
}
