/**
 * QUOI     — le résumé de la communauté sur le tableau de bord : amis, abonnés, et les demandes
 *            d'ami en attente, avec un bouton vers la page Communauté.
 * POURQUOI — Uriel, 19/10/2026 : il faut que les exposants aient envie de se connecter entre eux ;
 *            l'état du réseau se voit dès l'arrivée, pas seulement sur la page Communauté.
 * ATTENTION — une lecture ratée tait la carte : le tableau de bord ne s'arrête pas pour elle.
 */
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { networkCounts, requestsLabel } from '@/lib/community'
import { useTransitionNavigate } from '@/lib/navigation'
import { useNetwork } from '@/features/community/useNetwork'

export function CommunitySummary() {
  const { network } = useNetwork()
  const go = useTransitionNavigate()
  if (!network) return null

  const { friends, followers, requests } = network
  const waiting = requests.length > 0
  return (
    <section className="dashboard__section community-summary">
      <Users size={20} strokeWidth={1.8} className="community-summary__icon" />
      <span className="community-summary__text">
        <span className="community-summary__title">
          {waiting ? requestsLabel(requests.length) : 'Ta communauté'}
        </span>
        <span className="community-summary__note">
          {networkCounts(friends, followers)}.{' '}
          {waiting
            ? 'Suis en retour ceux qui te suivent : vous verrez où l’autre va.'
            : 'Suis les exposants que tu croises : vous verrez où l’autre va.'}
        </span>
      </span>
      <Button variant={waiting ? 'action' : 'solid'} onClick={() => go('/communaute')}>
        Voir
      </Button>
    </section>
  )
}
