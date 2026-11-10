/**
 * QUOI     — « Écrire » sur la vitrine d'un ami : ouvre la conversation à deux avec lui.
 * POURQUOI — le geste vit dans useWrite, partagé avec le fil de Ma communauté.
 */
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { useWrite } from './useWrite'

export function WriteButton({ actorId }: { actorId: string }) {
  const { actor } = useAuth()
  const { write, busy } = useWrite()

  if (!actor || actor.id === actorId) return null
  return (
    <Button
      icon={<MessageCircle size={16} strokeWidth={1.8} />}
      disabled={busy}
      onClick={() => void write(actorId)}
    >
      Écrire
    </Button>
  )
}
