/**
 * QUOI     — le retour de Stripe sur /pro?statut=succes : le bandeau de bienvenue, et la relecture
 *            de l'identité jusqu'à ce que l'enseigne soit Pro.
 * POURQUOI — le paiement n'arrive en base que par le webhook, quelques secondes après : sans
 *            relire, l'écran dirait « gratuit » à quelqu'un qui vient de payer.
 * ATTENTION — la relecture est bornée (lib/stripe.ts, nextPoll) : jamais de boucle. L'issue s'écrit
 *            dans l'adresse (statut=bienvenue ou statut=en-cours), à la place de session_id.
 *            On attend l'ABONNEMENT, pas le Pro : un Pro offert l'est déjà avant le webhook, et le
 *            bouton rouvrirait un second paiement.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { nextPoll, POLL_EVERY_MS } from '@/lib/stripe'
import { billingAction } from '@/lib/plan'

export type ReturnState = 'none' | 'waiting' | 'welcome' | 'late'

const FROM_URL: Record<string, ReturnState> = {
  succes: 'waiting',
  bienvenue: 'welcome',
  'en-cours': 'late',
}

export function useCheckoutReturn(): ReturnState {
  const [params, setParams] = useSearchParams()
  const { reloadIdentity, actor, entities } = useAuth()
  const subscribed =
    billingAction(entities.find((entity) => entity.actor_id === actor?.id) ?? null) === 'portal'
  const state = FROM_URL[params.get('statut') ?? ''] ?? 'none'
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (state !== 'waiting') return
    const step = nextPoll(attempt, subscribed)
    if (step !== 'wait') {
      setParams(
        (current) => {
          const params = new URLSearchParams(current)
          params.delete('session_id')
          params.set('statut', step === 'stop-pro' ? 'bienvenue' : 'en-cours')
          return params
        },
        { replace: true },
      )
      return
    }
    const timer = window.setTimeout(() => {
      void reloadIdentity()
        .catch(() => undefined)
        .finally(() => {
          setAttempt((n) => n + 1)
        })
    }, POLL_EVERY_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [state, attempt, subscribed, reloadIdentity, setParams])

  return state
}
