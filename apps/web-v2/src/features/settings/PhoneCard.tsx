/**
 * QUOI     — la carte du téléphone, en tête de la section Notifications : activer, couper, ou dire
 *            ce qui empêche (iPhone hors de l'écran d'accueil, refus, navigateur sans push).
 * POURQUOI — maquettes `2027 — Réglages · notifications sur le téléphone` et `… avant
 *            activation` (lot 8e). Jamais de bouton qui ne peut rien.
 */
import { Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { PhoneState, usePhonePush } from '@/lib/usePhonePush'

const SAYS: Record<PhoneState, { title: string; text: string }> = {
  loading: { title: 'Notifications sur ce téléphone', text: 'Un instant…' },
  possible: {
    title: 'Notifications sur ce téléphone',
    text: 'Reçois tes alertes même quand Fellowship est fermé.',
  },
  active: {
    title: 'Activées sur ce téléphone',
    text: 'Les lignes allumées ci-dessous sonnent aussi ici.',
  },
  'installer-d-abord': {
    title: 'Sur iPhone, ajoute d’abord Fellowship à l’écran d’accueil',
    text: 'Dans Safari, touche Partager, puis « Sur l’écran d’accueil ». Ouvre ensuite Fellowship depuis son icône pour activer.',
  },
  refuse: {
    title: 'Notifications refusées sur ce téléphone',
    text: 'Pour les recevoir, autorise-les pour Fellowship dans les réglages du téléphone ou du navigateur.',
  },
  impossible: {
    title: 'Ce navigateur ne reçoit pas les notifications',
    text: 'Essaie depuis un autre navigateur, ou depuis ton téléphone.',
  },
}

export function PhoneCard({ phone }: { phone: ReturnType<typeof usePhonePush> }) {
  const says = SAYS[phone.state]
  return (
    <div className="phone-card">
      <Smartphone size={20} strokeWidth={1.8} className="phone-card__icon" />
      <span className="phone-card__text">
        <span className="phone-card__title">{says.title}</span>
        <span className="phone-card__note">
          {phone.failed ? 'Ça n’a pas abouti. Réessaie dans un instant.' : says.text}
        </span>
      </span>
      {phone.state === 'possible' && (
        <Button variant="action" disabled={phone.busy} onClick={() => void phone.activate()}>
          Activer
        </Button>
      )}
      {phone.state === 'active' && (
        <Button disabled={phone.busy} onClick={() => void phone.cut()}>
          Couper
        </Button>
      )}
    </div>
  )
}
