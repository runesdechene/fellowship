import type { EventWithScore } from '@/types/database'

export const VIEW_MODES = ['upcoming', 'recent', 'all'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export function applyViewMode(
  events: EventWithScore[],
  mode: ViewMode,
  now: Date,
): EventWithScore[] {
  if (mode === 'upcoming') {
    return events.filter(ev => new Date(ev.start_date) >= now)
  }
  if (mode === 'recent') {
    return [...events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }
  return events
}
