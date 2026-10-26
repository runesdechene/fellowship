/**
 * QUOI     — tests du réseau d'une adresse et du lien à ouvrir.
 * POURQUOI — un lien saisi à la main ne doit jamais devenir autre chose que http(s), et un
 *            domaine qui ressemble à un réseau (fakeinstagram.com) ne doit pas le devenir.
 */
import { describe, expect, it } from 'vitest'
import { linkOf, networkOf } from './social'

describe('linkOf', () => {
  it('garde une adresse http(s), en ajoute le protocole sinon', () => {
    expect(linkOf('https://www.instagram.com/nevyprod')).toBe('https://www.instagram.com/nevyprod')
    expect(linkOf(' instagram.com/nevyprod ')).toBe('https://instagram.com/nevyprod')
  })

  it('refuse ce qui n’est pas une adresse', () => {
    expect(linkOf('@nevyprod')).toBeNull()
    expect(linkOf('javascript:alert(1)')).toBeNull()
    expect(linkOf('voir avec Mathéo')).toBeNull()
    expect(linkOf(null)).toBeNull()
  })
})

describe('networkOf', () => {
  it('reconnaît le réseau, sous-domaine compris', () => {
    expect(networkOf('https://www.facebook.com/profile.php?id=1')).toBe('Facebook')
    expect(networkOf('https://m.facebook.com/Pyrelion/')).toBe('Facebook')
    expect(networkOf('instagram.com/pivoine_onirique/')).toBe('Instagram')
  })

  it('ne reconnaît ni un site ni un domaine qui imite un réseau', () => {
    expect(networkOf('https://pyrelion.fr/')).toBeNull()
    expect(networkOf('https://fakeinstagram.com/x')).toBeNull()
    expect(networkOf('@nevyprod')).toBeNull()
  })
})
