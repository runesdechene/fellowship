/**
 * QUOI     — ouvrir la conversation à deux avec un ami, un festival joint au besoin.
 * POURQUOI — « Écrire » sur une vitrine (WriteButton) et dans le fil de Ma communauté (FeedItem).
 *            À deux, la conversation est unique (la base l'impose) : écrire rouvre l'existante.
 *            Le festival passe par l'adresse (`?festival=`), que la conversation lit (Conversation).
 */
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { openConversation } from '@/lib/discussion-api'
import { useTransitionNavigate } from '@/lib/navigation'
import { FESTIVAL_PARAM } from './Conversation'

export function useWrite() {
  const { actor } = useAuth()
  const go = useTransitionNavigate('messages-open')
  const { pathname } = useLocation()
  const [busy, setBusy] = useState(false)

  async function write(actorId: string, eventId?: string) {
    if (!actor || busy) return
    setBusy(true)
    try {
      const id = await openConversation(actor.id, [actorId], '')
      const query = eventId ? `?${FESTIVAL_PARAM}=${eventId}` : ''
      go(`/messages/${id}${query}`, { state: { from: pathname } })
    } catch {
      setBusy(false)
    }
  }

  return { write, busy }
}
