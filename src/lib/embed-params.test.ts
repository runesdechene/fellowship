import { describe, it, expect } from 'vitest'
import { parseEmbedParams } from './embed-params'

const P = (qs: string) => new URLSearchParams(qs)

describe('parseEmbedParams', () => {
  it('défauts (aucun param) → light, max tous (null), accent cuivre, pleine largeur', () => {
    expect(parseEmbedParams(P(''))).toEqual({
      theme: 'light', max: null, accent: '#c87941', maxWidth: null,
    })
  })

  it('theme dark / auto / inconnu', () => {
    expect(parseEmbedParams(P('theme=dark')).theme).toBe('dark')
    expect(parseEmbedParams(P('theme=auto')).theme).toBe('auto')
    expect(parseEmbedParams(P('theme=neon')).theme).toBe('light')
  })

  it('max : défaut null (tous), explicite clampé [1,50]', () => {
    expect(parseEmbedParams(P('')).max).toBeNull()
    expect(parseEmbedParams(P('max=2')).max).toBe(2)
    expect(parseEmbedParams(P('max=999')).max).toBe(50)
    expect(parseEmbedParams(P('max=0')).max).toBe(1)
    expect(parseEmbedParams(P('max=abc')).max).toBeNull()
  })

  it('accent hex valide accepté, sinon défaut', () => {
    expect(parseEmbedParams(P('accent=e74c3c')).accent).toBe('#e74c3c')
    expect(parseEmbedParams(P('accent=zzz')).accent).toBe('#c87941')
  })

  it('maxWidth : pleine largeur (null) par défaut ; maxw explicite clampé [240,2000]', () => {
    expect(parseEmbedParams(P('')).maxWidth).toBeNull()
    expect(parseEmbedParams(P('maxw=720')).maxWidth).toBe(720)
    expect(parseEmbedParams(P('maxw=99')).maxWidth).toBe(240)
    expect(parseEmbedParams(P('maxw=5000')).maxWidth).toBe(2000)
    expect(parseEmbedParams(P('maxw=abc')).maxWidth).toBeNull()
  })
})
