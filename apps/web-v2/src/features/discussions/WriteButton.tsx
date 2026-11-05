/**
 * QUOI     — « Écrire » sur la vitrine d'un ami : ouvre la conversation à deux avec lui.
 * POURQUOI — à deux, la conversation est unique (la base l'impose) : écrire rouvre l'existante.
 */
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { openConversation } from '@/lib/discussion-api'
import { useTransitionNavigate } from '@/lib/navigation'

export function WriteButton({ actorId }: { actorId: string }) {
  const { actor } = useAuth()
  const go = useTransitionNavigate()
  const { pathname } = useLocation()
  const [busy, setBusy] = useState(false)

  async function write() {
    if (!actor || busy) return
    setBusy(true)
    try {
      const id = await openConversation(actor.id, [actorId], '')
      go(`/messages/${id}`, { state: { from: pathname } })
    } catch {
      setBusy(false)
    }
  }

  if (!actor || actor.id === actorId) return null
  return (
    <Button
      icon={<MessageCircle size={16} strokeWidth={1.8} />}
      disabled={busy}
      onClick={() => void write()}
    >
      Écrire
    </Button>
  )
}
