/**
 * QUOI     — tests de supabase/functions/_shared/prospect-inbound.ts : lire un e-mail reçu.
 * POURQUOI — une réponse mal lue se rangerait dans le mauvais fil, ou nulle part.
 */
import { describe, expect, it } from 'vitest'
import {
  bodyText,
  emailAddress,
  isAutoReply,
  threadKeys,
  trustedSender,
} from '../../../../supabase/functions/_shared/prospect-inbound'

describe('emailAddress', () => {
  it('garde l’adresse, en minuscules, sans le nom', () => {
    expect(emailAddress('"Manon Leclerc" <Manon@CuirDeLune.fr>')).toBe('manon@cuirdelune.fr')
    expect(emailAddress('manon@cuirdelune.fr')).toBe('manon@cuirdelune.fr')
  })
})

describe('threadKeys', () => {
  it('In-Reply-To puis References, sans doublon', () => {
    expect(threadKeys({ 'In-Reply-To': '<b@x>', references: '<a@x> <b@x>' })).toEqual([
      '<b@x>',
      '<a@x>',
    ])
  })
  it('rien : liste vide', () => {
    expect(threadKeys({})).toEqual([])
  })
})

describe('bodyText', () => {
  it('le texte quand il existe', () => {
    expect(bodyText({ text: 'Bonjour', html: '<p>x</p>' })).toBe('Bonjour')
  })
  it('sinon l’HTML réduit à du texte', () => {
    expect(bodyText({ text: null, html: '<p>Merci &amp; à bientôt</p><p>Manon<br>Cuir</p>' })).toBe(
      'Merci & à bientôt\n\nManon\nCuir',
    )
  })
  it('un HTML en data:base64', () => {
    const html = `data:text/html;base64,${btoa('<p>Oui</p>')}`
    expect(bodyText({ text: null, html })).toBe('Oui')
  })
})

describe('bodyText, les cas difficiles', () => {
  it('retire les blocs style, script et head', () => {
    expect(
      bodyText({
        text: null,
        html: '<head><title>T</title><style>p{color:red}</style></head><p>Oui</p><script>x()</script>',
      }),
    ).toBe('Oui')
  })
  it('décode les entités nommées et numériques courantes', () => {
    expect(bodyText({ text: null, html: '<p>C&rsquo;est l&#233;ger, &eacute;t&eacute;</p>' })).toBe(
      'C’est léger, été',
    )
  })
  it('un data: en base64 invalide ne fait pas échouer', () => {
    expect(bodyText({ text: null, html: 'data:text/html;base64,%%%' })).toBe('')
  })
})

describe('trustedSender', () => {
  it('se fie à l’adresse seulement si DMARC passe', () => {
    expect(trustedSender({ spf: 'pass', dkim: 'pass', dmarc: 'pass' })).toBe(true)
    expect(trustedSender({ spf: 'pass', dkim: 'fail', dmarc: 'fail' })).toBe(false)
    expect(trustedSender(undefined)).toBe(false)
  })
})

describe('isAutoReply', () => {
  it('reconnaît un absent du bureau', () => {
    expect(isAutoReply({ 'Auto-Submitted': 'auto-replied' })).toBe(true)
    expect(isAutoReply({ 'x-autoreply': 'yes' })).toBe(true)
    expect(isAutoReply({ Precedence: 'auto_reply' })).toBe(true)
  })
  it('une réponse écrite par une personne n’en est pas une', () => {
    expect(isAutoReply({ 'Auto-Submitted': 'no' })).toBe(false)
    expect(isAutoReply({})).toBe(false)
  })
})
