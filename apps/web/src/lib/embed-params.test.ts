import { describe, it, expect } from 'vitest'
import { parseEmbedParams } from './embed-params'

const P = (qs: string) => new URLSearchParams(qs)

describe('parseEmbedParams', () => {
  it('défauts (aucun param) → light, max tous, accent cuivre, pleine largeur, preview 4, en-tête visible', () => {
    expect(parseEmbedParams(P(''))).toEqual({
      theme: 'light', max: null, accent: '#c87941', maxWidth: null, preview: 4, showHeader: true,
    })
  })

  it('preview : défaut 4, clampé [0,50], 0 = tout afficher', () => {
    expect(parseEmbedParams(P('')).preview).toBe(4)
    expect(parseEmbedParams(P('preview=8')).preview).toBe(8)
    expect(parseEmbedParams(P('preview=0')).preview).toBe(0)
    expect(parseEmbedParams(P('preview=999')).preview).toBe(50)
    expect(parseEmbedParams(P('preview=-3')).preview).toBe(0)
    expect(parseEmbedParams(P('preview=abc')).preview).toBe(4)
  })

  it('header=0 masque l\'en-tête, sinon visible', () => {
    expect(parseEmbedParams(P('header=0')).showHeader).toBe(false)
    expect(parseEmbedParams(P('header=1')).showHeader).toBe(true)
    expect(parseEmbedParams(P('')).showHeader).toBe(true)
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
