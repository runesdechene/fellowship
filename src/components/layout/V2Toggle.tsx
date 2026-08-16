import { useAuth } from '@/lib/auth'
import { resolveV2Switch, APP_V2_PARAM, APP_V2_STORAGE_KEY } from '@/lib/v2-switch'
import './V2Toggle.css'

/** Bascule V1 / V2 de l'app connectée, RÉSERVÉE AUX ADMINS — même forme que le
 *  commutateur jour/nuit, posée à côté de lui dans le pied du rail.
 *
 *  Un clic recharge la page sur `?app2=1` / `?app2=0` au lieu de basculer à chaud :
 *  le thème se résout au chargement du document (script anti-flash d'index.html),
 *  et l'interrupteur est lu une seule fois au montage. Basculer sans recharger
 *  donnerait le balisage V2 dans la palette de nuit. */
export function V2Toggle() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null

  // Lecture PURE : `readV2Switch` écrit en mémoire, ce qu'un rendu n'a pas à faire.
  const on = resolveV2Switch(
    APP_V2_PARAM,
    window.location.search,
    window.localStorage.getItem(APP_V2_STORAGE_KEY),
  ).enabled

  const toggle = () => {
    const url = new URL(window.location.href)
    url.searchParams.set(APP_V2_PARAM, on ? '0' : '1')
    window.location.href = url.toString()
  }

  return (
    <button
      type="button"
      className={`v2-toggle${on ? ' v2-toggle-on' : ''}`}
      onClick={toggle}
      aria-label={on ? "Revenir à l'ancienne interface" : 'Passer à la nouvelle interface'}
      title="Admin — bascule V1 / V2 de l'interface"
    >
      <span className="v2t-knob">{on ? 'V2' : 'V1'}</span>
    </button>
  )
}
