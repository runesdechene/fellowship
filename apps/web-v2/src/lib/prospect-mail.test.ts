/**
 * QUOI     — tests de supabase/functions/_shared/prospect-mail.ts : l'e-mail composé et la garde
 *            d'envoi de la fonction prospect-send.
 * POURQUOI — le fichier est pur (sans Deno) : on le teste ici, avec le reste.
 */
import { describe, expect, it } from 'vitest'
import {
  composeEmail,
  sendRefusal,
  toHtml,
} from '../../../../supabase/functions/_shared/prospect-mail'

describe('toHtml', () => {
  it('échappe, coupe en paragraphes, rend les liens cliquables', () => {
    expect(toHtml('A < B & C\nligne\n\nVoir https://flw.sh')).toBe(
      '<p>A &lt; B &amp; C<br>ligne</p><p>Voir <a href="https://flw.sh">https://flw.sh</a></p>',
    )
  })
})

describe('toHtml, les liens', () => {
  it('laisse la ponctuation finale hors du lien', () => {
    expect(toHtml('Viens voir https://flw.sh/festivals.')).toBe(
      '<p>Viens voir <a href="https://flw.sh/festivals">https://flw.sh/festivals</a>.</p>',
    )
  })
  it('un lien entre parenthèses ou entre chevrons', () => {
    expect(toHtml('(https://flw.sh)')).toBe('<p>(<a href="https://flw.sh">https://flw.sh</a>)</p>')
    expect(toHtml('<https://flw.sh>')).toBe(
      '<p>&lt;<a href="https://flw.sh">https://flw.sh</a>&gt;</p>',
    )
  })
  it('un lien entre guillemets', () => {
    expect(toHtml('"https://flw.sh"')).toBe(
      '<p>&quot;<a href="https://flw.sh">https://flw.sh</a>&quot;</p>',
    )
  })
})

describe('composeEmail', () => {
  it('ajoute la signature puis le pied de désinscription', () => {
    const mail = composeEmail({
      body: 'Bonjour',
      signature: 'Uriel — Fellowship',
      unsubscribeUrl: 'https://x/u?t=1',
    })
    expect(mail.text).toBe(
      'Bonjour\n\nUriel — Fellowship\n\n—\nTu ne veux plus recevoir nos e-mails ? Se désinscrire : https://x/u?t=1',
    )
    expect(mail.html).toContain('<a href="https://x/u?t=1">Se désinscrire</a>')
  })
  it('sans signature, pas de ligne vide en trop', () => {
    expect(composeEmail({ body: 'Bonjour', signature: '', unsubscribeUrl: 'u' }).text).toBe(
      'Bonjour\n\n—\nTu ne veux plus recevoir nos e-mails ? Se désinscrire : u',
    )
  })
})

describe('sendRefusal', () => {
  const ok = {
    email: 'a@b.fr',
    unsubscribedAt: null,
    ownerId: 'u1',
    callerId: 'u1',
    senderActive: true,
    subject: 'S',
    body: 'B',
  }
  it('laisse passer un envoi valide, et un prospect sans suiveur', () => {
    expect(sendRefusal(ok)).toBeNull()
    expect(sendRefusal({ ...ok, ownerId: null })).toBeNull()
  })
  it('refuse dans l’ordre : pas d’e-mail, désinscrit, autre suiveur, pas d’adresse, vide', () => {
    expect(sendRefusal({ ...ok, email: null })).toBe('no_email')
    expect(sendRefusal({ ...ok, unsubscribedAt: '2026-10-16' })).toBe('unsubscribed')
    expect(sendRefusal({ ...ok, ownerId: 'u2' })).toBe('not_owner')
    expect(sendRefusal({ ...ok, senderActive: false })).toBe('no_sender')
    expect(sendRefusal({ ...ok, body: '  ' })).toBe('empty')
  })
  it('refuse un emplacement resté entre accolades', () => {
    expect(sendRefusal({ ...ok, body: 'Bonjour {prenom},' })).toBe('placeholder')
    expect(sendRefusal({ ...ok, subject: 'Vu chez {marque}' })).toBe('placeholder')
  })
})
