/**
 * QUOI     — l'identifiant et le slug actuel de la fiche de la page, posés par EventRoute.
 * POURQUOI — les pages d'une fiche chargent par identifiant et lient par slug : EventRoute a
 *            résolu les deux une fois pour toutes.
 */
import { createContext, useContext } from 'react'

export type EventKey = { id: string; slug: string }

export const EventKeyContext = createContext<EventKey>({ id: '', slug: '' })

export function useEventKey(): EventKey {
  return useContext(EventKeyContext)
}
