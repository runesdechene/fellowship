/**
 * QUOI     — ce que l'invitation et le menu du compte savent de l'installation : faut-il la
 *            proposer, par le bouton du navigateur ou par le geste de l'iPhone, et l'a-t-on fait taire.
 * POURQUOI — la carte (InstallInvite) et la ligne du menu (InstallMenuItem) suivent le même état.
 */
import { useSyncExternalStore } from 'react'
import { installState, isInstalled, isIPhone } from './installation'

export function useInstall() {
  const canPrompt = useSyncExternalStore(installState.subscribe, installState.canPrompt)
  const dismissed = useSyncExternalStore(installState.subscribe, installState.dismissed)
  const iPhone = isIPhone(navigator.userAgent)
  return {
    // installable d'ici : déjà installée ou navigateur incapable → rien à proposer
    available: !isInstalled() && (canPrompt || iPhone),
    iPhone,
    dismissed,
  }
}
