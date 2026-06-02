import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, Tag } from '@/types/database'

export interface AdminUserRow {
  actor_id: string
  display_name: string | null
  email: string
  role: string
  created_at: string
}

// --- Metrics ---

interface AdminMetrics {
  totalExposants: number
  totalVisitors: number
  totalUsers: number
  activeEvents: number
  participationsThisMonth: number
  newUsers7d: number
  newUsers30d: number
}

export function useAdminMetrics() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const now = new Date()
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString()
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString()

      const [exposants, visitors, events, participations, recent7, recent30] = await Promise.all([
        supabase.from('entities').select('actor_id', { count: 'exact', head: true }).eq('type', 'exposant'),
        supabase.from('users').select('actor_id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('end_date', now.toISOString().slice(0, 10)),
        supabase.from('participations').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
        supabase.from('users').select('actor_id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('users').select('actor_id', { count: 'exact', head: true }).gte('created_at', d30),
      ])

      setMetrics({
        totalExposants: exposants.count ?? 0,
        totalVisitors: visitors.count ?? 0,
        totalUsers: visitors.count ?? 0,
        activeEvents: events.count ?? 0,
        participationsThisMonth: participations.count ?? 0,
        newUsers7d: recent7.count ?? 0,
        newUsers30d: recent30.count ?? 0,
      })
      setLoading(false)
    }
    fetch()
  }, [])

  return { metrics, loading }
}

// --- Events ---

export function useAdminEvents() {
  const [events, setEvents] = useState<(Event & { participant_count: number; creator_name: string | null })[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchEvents() {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    // Créateur résolu via le modèle acteur (created_by_actor -> actor_public).
    // L'ancien join profiles!events_created_by_fkey est mort (FK droppée en Plan 4 ph.1).
    const rows = (data ?? []) as Event[]
    const actorIds = [...new Set(rows.map(e => e.created_by_actor).filter((id): id is string => !!id))]
    let nameMap: Record<string, string | null> = {}
    if (actorIds.length > 0) {
      const { data: actors } = await supabase.from('actor_public').select('actor_id, label').in('actor_id', actorIds)
      nameMap = Object.fromEntries((actors ?? []).map(a => [a.actor_id, a.label]))
    }
    const mapped = rows.map(e => ({
      ...e,
      participant_count: 0,
      creator_name: e.created_by_actor ? (nameMap[e.created_by_actor] ?? null) : null,
    }))

    // Batch count participations per event
    if (mapped.length > 0) {
      const { data: counts } = await supabase
        .from('participations')
        .select('event_id')
      const countMap: Record<string, number> = {}
      for (const p of counts ?? []) {
        countMap[p.event_id] = (countMap[p.event_id] ?? 0) + 1
      }
      for (const e of mapped) {
        e.participant_count = countMap[e.id] ?? 0
      }
    }

    setEvents(mapped)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEvents() }, [])

  return { events, loading, refetch: fetchEvents }
}

export async function adminDeleteEvent(id: string) {
  return supabase.from('events').delete().eq('id', id)
}

// --- Users ---

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('actor_id, display_name, email, role, created_at')
      .order('created_at', { ascending: false })
    setUsers((data as AdminUserRow[] | null) ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchUsers() }, [])

  return { users, loading, refetch: fetchUsers }
}

// --- Tags ---

export function useAdminTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchTags() {
    setLoading(true)
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('sort_order', { ascending: true })
    setTags(data ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTags() }, [])

  async function createTag(tag: { name: string; slug: string; bg_color: string; text_color: string; sort_order: number }) {
    const { error } = await supabase.from('tags').insert(tag)
    if (!error) await fetchTags()
    return { error }
  }

  async function updateTag(id: string, updates: Partial<{ name: string; slug: string; bg_color: string; text_color: string; sort_order: number }>) {
    const { error } = await supabase.from('tags').update(updates).eq('id', id)
    if (!error) await fetchTags()
    return { error }
  }

  async function deleteTag(id: string) {
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (!error) await fetchTags()
    return { error }
  }

  return { tags, loading, refetch: fetchTags, createTag, updateTag, deleteTag }
}

// --- Reports ---
// useAdminReports (legacy, lisait event_reports) RETIRÉ : les bilans post-festival
// sont désormais strictement privés à leur auteur (drop des policies admin sur
// event_reports). Les vrais signalements vivent dans content_reports et leur hook
// est dans @/hooks/use-content-reports.
