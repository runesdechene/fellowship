/**
 * QUOI     — tests de supabase/functions/_shared/update-mail.ts : l'e-mail d'une grosse mise à jour
 *            et le découpage des envois en lots.
 * POURQUOI — le fichier est pur (sans Deno) : on le teste ici, avec le reste.
 */
import { describe, expect, it } from 'vitest'
import {
  chunks,
  composeUpdateEmail,
  releaseClaim,
} from '../../../../supabase/functions/_shared/update-mail'

const base = {
  title: 'La nouvelle\nFellowship est là',
  body: 'Premier paragraphe.\n\nDeuxième, https://flw.sh.\n\nTroisième, coupé.',
  imageUrl: null,
  url: 'https://flw.sh/nouveautes',
  unsubscribeUrl: 'https://x.supabase.co/functions/v1/prospect-unsubscribe?t=abc',
}

describe('composeUpdateEmail', () => {
  it('prend le titre pour objet, sur une ligne', () => {
    expect(composeUpdateEmail(base).subject).toBe('La nouvelle Fellowship est là')
  })
  it('garde les deux premiers paragraphes et mène à la page', () => {
    const mail = composeUpdateEmail(base)
    expect(mail.text).toContain('Deuxième')
    expect(mail.text).not.toContain('Troisième')
    expect(mail.text).toContain('Voir la nouveauté : https://flw.sh/nouveautes')
    expect(mail.html).toContain('href="https://flw.sh/nouveautes"')
  })
  it('montre l’image seulement s’il y en a une', () => {
    expect(composeUpdateEmail(base).html).not.toContain('<img')
    expect(composeUpdateEmail({ ...base, imageUrl: 'https://i/x.webp' }).html).toContain(
      '<img src="https://i/x.webp"',
    )
  })
  it('porte le lien de désinscription, en texte et en HTML', () => {
    const mail = composeUpdateEmail(base)
    expect(mail.text).toContain(base.unsubscribeUrl)
    expect(mail.html).toContain(`href="${base.unsubscribeUrl}"`)
  })
  it('échappe le titre dans le HTML', () => {
    expect(composeUpdateEmail({ ...base, title: 'A <b>' }).html).toContain('A &lt;b&gt;')
  })
})

describe('chunks', () => {
  it('coupe en lots de 100', () => {
    const list = Array.from({ length: 250 }, (_, i) => i)
    expect(chunks(list, 100).map((lot) => lot.length)).toEqual([100, 100, 50])
    expect(chunks([], 100)).toEqual([])
  })
})

describe('releaseClaim', () => {
  it('rend la note à l’envoi quand aucun lot n’est parti', () => {
    expect(releaseClaim(0, 41)).toBe(true)
  })
  it('garde la note envoyée dès qu’un lot est parti : jamais de doublon', () => {
    expect(releaseClaim(100, 250)).toBe(false)
  })
  it('sans destinataire, la note reste envoyée', () => {
    expect(releaseClaim(0, 0)).toBe(false)
  })
})
