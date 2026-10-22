/**
 * QUOI     — l'invitation du tableau de bord : « Ne rate plus une clôture. » · Plus tard · Activer.
 * POURQUOI — maquette `2027 — Tableau de bord · invitation au téléphone` (lot 8e) : une carte, pas
 *            une fenêtre. Elle ne s'affiche que si cet appareil peut recevoir et n'est pas activé.
 *            Elle dit « appareil », avec l'icône d'un ordinateur hors écran tactile (Uriel, 22/10/2026).
 * ATTENTION — « Plus tard » la cache 30 jours, retenu sur CET appareil (stockage local, simple
 *            commodité : vide ou bloqué, la carte revient, rien ne casse).
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DeviceIcon } from '@/components/ui/DeviceIcon'
import { inviteHidden } from '@/lib/push-device'
import { usePhonePush } from '@/lib/usePhonePush'

const LATER_KEY = 'flwsh-v2-push-invite-later'

function readLater(): string | null {
  try {
    return localStorage.getItem(LATER_KEY)
  } catch {
    return null
  }
}

function writeLater(at: string) {
  try {
    localStorage.setItem(LATER_KEY, at)
  } catch {
    /* stockage indisponible : la carte reviendra au prochain passage */
  }
}

export function PhoneInvite() {
  const phone = usePhonePush()
  const [later, setLater] = useState(readLater)
  if (phone.state !== 'possible' || inviteHidden(later, new Date())) return null

  return (
    <section className="dashboard__section phone-invite">
      <DeviceIcon size={20} strokeWidth={1.8} className="phone-invite__icon" />
      <span className="phone-invite__text">
        <span className="phone-invite__title">Ne rate plus une clôture.</span>
        <span className="phone-invite__note">
          {phone.failed
            ? 'Ça n’a pas abouti. Réessaie dans un instant.'
            : 'Reçois tes alertes sur cet appareil : clôtures des candidatures, nouvelles éditions, ce que font tes amis.'}
        </span>
      </span>
      <span className="phone-invite__actions">
        <Button
          onClick={() => {
            const now = new Date().toISOString()
            writeLater(now)
            setLater(now)
          }}
        >
          Plus tard
        </Button>
        <Button variant="action" disabled={phone.busy} onClick={() => void phone.activate()}>
          Activer
        </Button>
      </span>
    </section>
  )
}
