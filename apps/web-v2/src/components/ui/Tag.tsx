/**
 * QUOI     — la pastille d'une catégorie sur la fiche d'un événement.
 * POURQUOI — ses deux couleurs sont des DONNÉES réglées tag par tag dans l'administration : c'est
 *            la seule raison pour laquelle ce composant pose un `style`.
 */
import type { CSSProperties } from 'react'
import type { TagStyle } from '@/lib/tags'

/**
 * Une catégorie qui DÉCRIT — sur la fiche d'un événement, pas dans l'atelier
 * où elle se choisit.
 *
 * Ses deux couleurs viennent de la base, réglées tag par tag depuis
 * l'administration. C'est la seule raison pour laquelle ce composant pose un
 * `style` : ce ne sont pas des valeurs de design, ce sont des DONNÉES. Les
 * remplacer par un token d'interface, c'est débrancher le réglage.
 *
 * Sans couleur connue — un tag retiré de l'administration mais resté sur un
 * événement — la pastille retombe sur le neutre plutôt que de disparaître.
 */
export function Tag({ name, style }: { name: string; style?: TagStyle }) {
  // Sa propre classe, jamais celle de l'atelier : la-bas un tag se CLIQUE
  // (32 px de haut, en gras), ici il DECRIT. Reutiliser `.tag` avait ramene
  // le gabarit du bouton sur la fiche.
  return (
    <span
      className="tag-badge"
      style={
        style
          ? ({ '--tag-bg': style.bgColor, '--tag-ink': style.textColor } as CSSProperties)
          : undefined
      }
    >
      {style?.label ?? name}
    </span>
  )
}
