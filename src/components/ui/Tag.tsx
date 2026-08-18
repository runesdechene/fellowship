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
  const colors = style
    ? ({
        '--tag-bg': style.bgColor,
        '--tag-ink': style.textColor,
      } as CSSProperties)
    : undefined

  return (
    <span className={style ? 'tag tag--painted' : 'tag'} style={colors}>
      {name}
    </span>
  )
}
