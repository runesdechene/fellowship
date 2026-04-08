import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { EventInsert, EventUpdate, EventWithScore } from '@/types/database'

export function useEvents(filters?: {
  department?: string
  tag?: string
  search?: string
  year?: number
}) {
  const [events, setEvents] = useState<EventWithScore[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchEvents() {
    setLoading(true)
    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })

    if (filters?.department) {
      query = query.eq('department', filters.department)
    }
    if (filters?.tag) {
      query = query.contains('tags', [filters.tag])
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }
    if (filters?.year) {
      query = query
        .gte('start_date', `${filters.year}-01-01`)
        .lte('end_date', `${filters.year}-12-31`)
    }

    const { data } = await query
    const mapped: EventWithScore[] = (data ?? []).map((e) => ({
      ...e,
      avg_overall: null,
      review_count: null,
      avg_affluence: null,
      avg_organisation: null,
      avg_rentabilite: null,
    }))
    setEvents(mapped)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEvents() }, [filters?.department, filters?.tag, filters?.search, filters?.year])

  return { events, loading, refetch: fetchEvents }
}

export function useEvent(id: string | undefined) {
  const [event, setEvent] = useState<EventWithScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setEvent({
            ...data,
            avg_overall: null,
            review_count: null,
            avg_affluence: null,
            avg_organisation: null,
            avg_rentabilite: null,
          })
        }
        setLoading(false)
      })
  }, [id])

  return { event, loading }
}

export async function createEvent(event: EventInsert) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single()
  return { data, error }
}

export async function updateEvent(id: string, updates: EventUpdate) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export function useRecentEvents(limit = 6) {
  const [events, setEvents] = useState<EventWithScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setEvents((data ?? []).map(e => ({
          ...e,
          avg_overall: null,
          review_count: null,
          avg_affluence: null,
          avg_organisation: null,
          avg_rentabilite: null,
        })))
        setLoading(false)
      })
  }, [limit])

  return { events, loading }
}

export async function searchSimilarEvents(name: string, startDate?: string) {
  const searchYear = startDate ? parseInt(startDate.substring(0, 4)) : undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.rpc as any)('search_similar_events', {
    search_name: name,
    search_year: searchYear ?? null,
    threshold: 0.25,
  })

  return (data ?? []) as { id: string; name: string; city: string; department: string; start_date: string; end_date: string; score: number }[]
}

export function useEventCreator(createdBy: string | null | undefined) {
  const [creator, setCreator] = useState<{
    id: string
    display_name: string | null
    brand_name: string | null
    avatar_url: string | null
    public_slug: string | null
    craft_type: string | null
  } | null>(null)

  useEffect(() => {
    if (!createdBy) return
    supabase
      .from('profiles')
      .select('id, display_name, brand_name, avatar_url, public_slug, craft_type')
      .eq('id', createdBy)
      .single()
      .then(({ data }) => {
        if (data) setCreator(data)
      })
  }, [createdBy])

  return creator
}
