/**
 * QUOI     — la carte qui clôt « Où vont tes amis » quand on ne suit personne : « Trouve tes
 *            compagnons de route », toute la carte mène à la Communauté.
 * POURQUOI — Uriel, 22/10/2026 : un bouton posé à droite de la rangée ne donnait pas envie ; une
 *            carte de la taille d'une affiche, au bout des cartes devinées, si (comme ProEndCard).
 */
import { ArrowRight, UserPlus } from 'lucide-react'
import { useTransitionNavigate } from '@/lib/navigation'

export function FriendsInviteCard() {
  const go = useTransitionNavigate()

  return (
    <button
      type="button"
      className="friends-invite skeleton-card"
      onClick={() => go('/communaute')}
    >
      <span className="friends-invite__icon">
        <UserPlus size={22} strokeWidth={1.8} />
      </span>
      <span className="friends-invite__title">Trouve tes compagnons de route</span>
      <span className="friends-invite__text">
        Suis des exposants : les festivals où ils vont s’afficheront ici, avec leurs visages.
      </span>
      <span className="friends-invite__link">
        Voir les exposants
        <ArrowRight size={14} strokeWidth={2} />
      </span>
    </button>
  )
}
