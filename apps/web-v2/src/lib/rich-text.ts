/**
 * QUOI     — nettoie le HTML d'une description d'événement (DOMPurify, liste blanche de balises),
 *            et dit si une description est vide.
 * POURQUOI — le contenu vient d'un utilisateur : sans ce passage, une description piégée
 *            s'exécuterait chez tous ceux qui ouvrent la fiche.
 */
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
  return (
    cleanRichText(html)
      .replace(/<[^>]*>/g, '')
      .trim() === ''
  )
}

/**
 * Le texte d'une description, pour la modifier (lot 10c) : paragraphes séparés d'une ligne vide,
 * puces « • ». Le gras et les titres ne survivent pas : c'est assumé (Uriel, 12/10/2026).
 */
export function htmlToText(html: string | null): string {
  if (!html) return ''
  if (!/<[a-z]/i.test(html)) return html.trim()
  const doc = new DOMParser().parseFromString(cleanRichText(html), 'text/html')
  const blocks: string[] = []
  for (const node of Array.from(doc.body.childNodes)) {
    if (node instanceof HTMLUListElement || node instanceof HTMLOListElement) {
      const items = Array.from(node.children).map((item) => `• ${item.textContent.trim()}`)
      blocks.push(items.join('\n'))
    } else if (node instanceof HTMLElement) {
      node.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
      blocks.push(node.textContent.trim())
    } else {
      blocks.push((node.textContent ?? '').trim())
    }
  }
  return blocks.filter(Boolean).join('\n\n')
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Un texte tapé, rendu en HTML pour la fiche : un paragraphe par bloc, un retour par ligne. */
export function textToHtml(text: string): string | null {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
  if (blocks.length === 0) return null
  return blocks.map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`).join('')
}
