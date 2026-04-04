import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Review, ReviewInsert } from '@/types/database'

export function useEventReviews(eventId: string | undefined) {
  const { profile } = useAuth()
  const [reviews, setReviews] = useState<(Review & { profiles: { display_name: string; brand_name: string | null } })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    fetchReviews()
  }, [eventId])

  async function fetchReviews() {
    if (!eventId) return
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(display_name, brand_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setReviews((data as any) ?? [])
    setLoading(false)
  }

  const canSeeDetails = profile?.type === 'exposant' && profile?.plan === 'pro'

  return { reviews, loading, canSeeDetails, refetch: fetchReviews }
}

export function useMyReview(eventId: string | undefined) {
  const { user } = useAuth()
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !user) return
    supabase
      .from('reviews')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setReview(data)
        setLoading(false)
      })
  }, [eventId, user])

  return { review, loading }
}

export async function submitReview(review: ReviewInsert) {
  const { data, error } = await supabase
    .from('reviews')
    .upsert(review, { onConflict: 'user_id,event_id' })
    .select()
    .single()
  return { data, error }
}
