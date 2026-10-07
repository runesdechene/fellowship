import { useState, useEffect } from 'react'
import { fetchDynamicTags } from '@/lib/constants'

type DynamicTag = { value: string; label: string; bg: string; color: string }

let cache: DynamicTag[] | null = null

export function useTags() {
  const [tags, setTags] = useState<DynamicTag[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) return
    fetchDynamicTags().then(t => {
      cache = t
      setTags(t)
      setLoading(false)
    })
  }, [])

  return { tags, loading }
}
