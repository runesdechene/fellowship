/**
 * QUOI     — un contenu flouté, inerte, avec une invitation posée par-dessus, au centre.
 * POURQUOI — en gratuit, on devine ce que le Pro donnerait au lieu de le cacher (bilans, notes
 *            détaillées) : ce sont les chiffres de l'exposant lui-même, simplement illisibles.
 * ATTENTION — le contenu est retiré du clavier et des lecteurs d'écran (inert, aria-hidden). Le
 *            flou coûte sur une grande couche : à réserver à des blocs de taille modeste
 *            (.claude/rules/interface.md).
 */
import type { ReactNode } from 'react'

export function ProVeil({ children, invitation }: { children: ReactNode; invitation: ReactNode }) {
  return (
    <div className="pro-veil">
      <div className="pro-veil__content" aria-hidden="true" inert>
        {children}
      </div>
      <div className="pro-veil__invitation">{invitation}</div>
    </div>
  )
}
