/**
 * QUOI     — tests du passage d'une description entre le HTML de la fiche et le texte qu'on modifie.
 * POURQUOI — lot 10c : une description de la V1 (paragraphes, listes) doit se relire en texte, et un
 *            texte tapé garder ses paragraphes une fois affiché sur la fiche.
 */
import { describe, expect, test } from 'vitest'
import { htmlToText, textToHtml, descriptionExcerpt } from './rich-text'

describe('htmlToText', () => {
  test('les paragraphes deviennent des lignes vides, les puces des « • »', () => {
    expect(
      htmlToText(
        '<p>Un <strong>village</strong> pirate.</p><ul><li>Viking</li><li>Médiéval</li></ul><p>Fin</p>',
      ),
    ).toBe('Un village pirate.\n\n• Viking\n• Médiéval\n\nFin')
  })
  test('un retour à la ligne et les entités', () => {
    expect(htmlToText('<p>Ligne 1<br>Ligne 2 &amp; co</p>')).toBe('Ligne 1\nLigne 2 & co')
  })
  test('un texte brut reste tel quel ; rien donne rien', () => {
    expect(htmlToText('Déjà du texte')).toBe('Déjà du texte')
    expect(htmlToText(null)).toBe('')
  })
})

describe('textToHtml', () => {
  test('un paragraphe par bloc, un retour à la ligne par ligne, le HTML échappé', () => {
    expect(textToHtml('Un <b>\nDeux\n\nTrois')).toBe('<p>Un &lt;b&gt;<br>Deux</p><p>Trois</p>')
  })
  test('vide donne null', () => {
    expect(textToHtml('  \n ')).toBeNull()
  })
  test('aller-retour stable', () => {
    const text = 'Un\n\n• Viking\n• Médiéval'
    expect(htmlToText(textToHtml(text))).toBe(text)
  })
})

describe('descriptionExcerpt', () => {
  test('une description riche devient une seule phrase continue', () => {
    expect(
      descriptionExcerpt('<p>Deux jours d’encre.</p><ul><li>Flash</li></ul><p>Et  plus.</p>'),
    ).toBe('Deux jours d’encre. • Flash Et plus.')
  })
  test('vide ou absente : rien', () => {
    expect(descriptionExcerpt(null)).toBe('')
    expect(descriptionExcerpt('<p> </p>')).toBe('')
  })
})
