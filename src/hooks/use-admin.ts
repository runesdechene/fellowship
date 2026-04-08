import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, Profile, Tag } from '@/types/database'

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
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('type', 'exposant'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('type', 'public'),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('end_date', now.toISOString().slice(0, 10)),
        supabase.from('participations').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', d30),
      ])

      setMetrics({
        totalExposants: exposants.count ?? 0,
        totalVisitors: visitors.count ?? 0,
        totalUsers: (exposants.count ?? 0) + (visitors.count ?? 0),
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
      .select('*, profiles!events_created_by_fkey(display_name)')
      .order('created_at', { ascending: false })

    const mapped = (data ?? []).map((e: Record<string, unknown>) => ({
      ...(e as Event),
      participant_count: 0,
      creator_name: (e.profiles as { display_name: string | null } | null)?.display_name ?? null,
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
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
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

interface ReportWithEvent {
  id: string
  event_id: string
  user_id: string
  created_at: string
  revenue: number | null
  booth_cost: number | null
  charges: number | null
  wins: string[] | null
  improvements: string[] | null
  event_name: string | null
}

export function useAdminReports() {
  const [reports, setReports] = useState<ReportWithEvent[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchReports() {
    setLoading(true)
    const { data } = await supabase
      .from('event_reports')
      .select('*, events(name)')
      .order('created_at', { ascending: false })

    const mapped = (data ?? []).map((r: Record<string, unknown>) => ({
      ...(r as unknown as ReportWithEvent),
      event_name: (r.events as { name: string } | null)?.name ?? null,
    }))
    setReports(mapped)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchReports() }, [])

  return { reports, loading, refetch: fetchReports }
}
