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
      query = query.eq('primary_tag', filters.tag)
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

export async function searchSimilarEvents(name: string, startDate?: string) {
  let query = supabase
    .from('events')
    .select('id, name, city, department, start_date, end_date')
    .ilike('name', `%${name}%`)
    .limit(5)

  if (startDate) {
    const year = startDate.substring(0, 4)
    query = query.gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`)
  }

  const { data } = await query
  return data ?? []
}
