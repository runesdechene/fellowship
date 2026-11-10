/**
 * QUOI     — l'état de l'invitation « Installer Fellowship » : la demande d'installation du
 *            navigateur (Android, Chrome sur ordinateur), et la croix qui la fait taire.
 * POURQUOI — Chrome ne tire `beforeinstallprompt` qu'une fois par chargement, souvent avant que
 *            React ne monte : écouté depuis un composant, il serait perdu. D'où un état hors de
 *            React, branché dès main.tsx (même mécanique que Runes de Chêne).
 * ATTENTION — Safari ne tire jamais cet événement : sur iPhone, l'invitation montre le geste.
 */

interface InstallRequest extends Event {
  prompt: () => Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallRequest
  }
}

const LATER_KEY = 'flwsh-install-later'

let request: InstallRequest | null = null
let dismissed = readDismissed()
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(LATER_KEY) === '1'
  } catch {
    return false
  }
}

// Lu par useInstall (useSyncExternalStore).
export const installState = {
  // le navigateur sait installer de lui-même
  canPrompt: () => request !== null,
  // la croix l'a fait taire jusqu'à la prochaine ouverture
  dismissed: () => dismissed,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // pas la mini-barre de Chrome : notre invitation la remplace
    request = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    request = null
    notify()
  })
}

// La fenêtre du navigateur ; la demande ne sert qu'une fois, acceptée ou non.
export async function promptInstall() {
  const pending = request
  request = null
  notify()
  await pending?.prompt()
}

// La croix de l'invitation (true), puis la ligne du menu qui la rappelle (false).
export function dismissInstall(value: boolean) {
  dismissed = value
  try {
    if (value) sessionStorage.setItem(LATER_KEY, '1')
    else sessionStorage.removeItem(LATER_KEY)
  } catch {
    // stockage indisponible : l'état en mémoire suffit jusqu'à la prochaine ouverture
  }
  notify()
}

export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function isIPhone(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent)
}
