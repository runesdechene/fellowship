/**
 * QUOI     — le pied du panneau de la cloche : « Régler mes notifications », puis la ligne
 *            « Recevoir ces notifications sur ton téléphone · Activer ».
 * POURQUOI — maquettes `2027 — Notifications` et `2027 — Cloche · recevoir sur le téléphone`
 *            (lot 8e). La ligne du téléphone n'apparaît que si ce téléphone peut recevoir et n'est
 *            pas encore activé ; « Activer » active directement.
 */
import { Settings, Smartphone } from 'lucide-react'
import { useTransitionNavigate } from '@/lib/navigation'
import { usePhonePush } from '@/lib/usePhonePush'

export function PanelFoot({ onClose }: { onClose: () => void }) {
  const go = useTransitionNavigate()
  const phone = usePhonePush()
  return (
    <div className="notif-panel__foot">
      <button
        type="button"
        className="notif-panel__settings"
        onClick={() => {
          onClose()
          go('/reglages')
        }}
      >
        <Settings size={14} strokeWidth={1.8} />
        Régler mes notifications
      </button>
      {phone.state === 'possible' && (
        <div className="notif-panel__phone">
          <Smartphone size={16} strokeWidth={1.8} />
          <span className="notif-panel__phone-text">
            {phone.failed
              ? 'Ça n’a pas abouti. Réessaie dans un instant.'
              : 'Recevoir ces notifications sur ton téléphone'}
          </span>
          <button
            type="button"
            className="notif-panel__phone-on"
            disabled={phone.busy}
            onClick={() => void phone.activate()}
          >
            Activer
          </button>
        </div>
      )}
    </div>
  )
}
