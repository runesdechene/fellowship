import { cleanRichText } from '@/lib/rich-text'

/**
 * Un texte mis en forme par un organisateur : paragraphes, retours a la ligne,
 * gras, listes, titres. La V1 le rendait deja ainsi ; l'afficher en texte brut
 * ecrasait toute sa mise en page en un seul pave.
 *
 * Le contenu est NETTOYE avant d'arriver ici (voir `cleanRichText`) : c'est la
 * seule raison pour laquelle on a le droit de l'injecter tel quel. Ne jamais
 * poser de HTML utilisateur sans ce passage.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className ?? 'rich-text'}
      dangerouslySetInnerHTML={{ __html: cleanRichText(html) }}
    />
  )
}
