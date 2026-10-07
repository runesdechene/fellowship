/**
 * QUOI     — décide, à partir de la session et de la réponse de la base, si la V2 s'ouvre.
 * POURQUOI — la V2 se construit sous les yeux des seuls admins (is_admin(), déjà en base).
 *            Fonctions pures : toute la garde se lit et se teste ici, sans navigateur.
 * ATTENTION — une erreur de vérification renvoie vers la V1 : pendant la construction, mieux
 *            vaut un admin qui recharge qu'un écran blanc. Pas de PWA côté V2, donc pas
 *            d'usage hors ligne à protéger.
 */
export type AccessCheck = 'pending' | 'allowed' | 'refused' | 'error'

type AccessState =
  | { status: 'loading' }
  | { status: 'ready'; hasSession: boolean; hasAccess: boolean }
  | { status: 'error' }

export type AccessDecision = 'wait' | 'allow' | 'login' | 'leave'

export function toAccessState(input: {
  authLoading: boolean
  hasUser: boolean
  check: AccessCheck
}): AccessState {
  if (input.authLoading) return { status: 'loading' }
  if (!input.hasUser) return { status: 'ready', hasSession: false, hasAccess: false }
  switch (input.check) {
    case 'pending':
      return { status: 'loading' }
    case 'error':
      return { status: 'error' }
    case 'allowed':
      return { status: 'ready', hasSession: true, hasAccess: true }
    case 'refused':
      return { status: 'ready', hasSession: true, hasAccess: false }
  }
}

// Combine une nouvelle réponse de la base avec la précédente, pour le même compte. Un échec de
// re-vérification (jeton qui se rafraîchit, onglet qui revient sur un réseau instable) ne doit
// pas éjecter un admin déjà admis au milieu d'une saisie ; un accès RETIRÉ, lui, s'applique.
export function settleCheck(
  previous: AccessCheck | undefined,
  result: Exclude<AccessCheck, 'pending'>,
): AccessCheck {
  if (previous === 'allowed' && result === 'error') return 'allowed'
  return result
}

export function decideAccess(state: AccessState): AccessDecision {
  switch (state.status) {
    case 'loading':
      return 'wait'
    case 'error':
      return 'leave'
    case 'ready':
      if (!state.hasSession) return 'login'
      return state.hasAccess ? 'allow' : 'leave'
  }
}
