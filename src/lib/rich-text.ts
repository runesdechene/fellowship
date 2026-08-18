import DOMPurify from 'dompurify'

/**
 * Les balises qu'une description d'événement a le droit de porter. Un
 * organisateur met en forme son texte : des paragraphes, des retours à la
 * ligne, du gras, des listes, un lien. Rien qui exécute, rien qui charge —
 * ni script, ni image, ni iframe.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'a',
]

/**
 * Nettoie un texte mis en forme avant de le poser dans la page.
 *
 * Le contenu vient d'un utilisateur : sans ce passage, une description
 * piégée s'exécuterait chez tous ceux qui ouvrent la fiche. On garde la mise
 * en forme, on jette le reste — et les liens s'ouvrent ailleurs, sans laisser
 * la main sur l'onglet d'origine.
 */
export function cleanRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ADD_ATTR: ['target'],
    FORBID_ATTR: ['style', 'class', 'onerror', 'onload'],
  })
}

/**
 * Un texte mis en forme est-il vide une fois dépouillé ? Une description qui
 * ne contient qu'un paragraphe vide ne doit pas faire croire que
 * l'organisateur a écrit quelque chose.
 */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true
  return cleanRichText(html).replace(/<[^>]*>/g, '').trim() === ''
}
