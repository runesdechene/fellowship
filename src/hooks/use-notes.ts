import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { NoteWithAuthor, NoteInsert } from '@/types/database'

export function useEventNotes(eventId: string | undefined) {
  const [notes, setNotes] = useState<NoteWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    fetchNotes()
  }, [eventId])

  async function fetchNotes() {
    if (!eventId) return
    const { data } = await supabase
      .from('notes')
      .select('*, profiles(id, display_name, avatar_url, brand_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setNotes((data as NoteWithAuthor[] | null) ?? [])
    setLoading(false)
  }

  return { notes, loading, refetch: fetchNotes }
}

export async function createNote(note: NoteInsert) {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select('*, profiles(id, display_name, avatar_url, brand_name)')
    .single()
  return { data, error }
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  return { error }
}
