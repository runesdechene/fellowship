import { describe, it, expect } from 'vitest'
import { parseEmbedParams } from './embed-params'

const P = (qs: string) => new URLSearchParams(qs)

describe('parseEmbedParams', () => {
  it('défauts (aucun param) → full, light, max 10, accent cuivre, pleine largeur', () => {
    expect(parseEmbedParams(P(''))).toEqual({
      view: 'full', theme: 'light', max: 10, accent: '#c87941', maxWidth: null,
    })
  })

  it('view=mini → max par défaut 4', () => {
    const r = parseEmbedParams(P('view=mini'))
    expect(r.view).toBe('mini')
    expect(r.max).toBe(4)
  })

  it('view inconnu → full', () => {
    expect(parseEmbedParams(P('view=banana')).view).toBe('full')
  })

  it('theme dark / auto / inconnu', () => {
    expect(parseEmbedParams(P('theme=dark')).theme).toBe('dark')
    expect(parseEmbedParams(P('theme=auto')).theme).toBe('auto')
    expect(parseEmbedParams(P('theme=neon')).theme).toBe('light')
  })

  it('max explicite est clampé [1,50]', () => {
    expect(parseEmbedParams(P('max=2')).max).toBe(2)
    expect(parseEmbedParams(P('max=999')).max).toBe(50)
    expect(parseEmbedParams(P('max=0')).max).toBe(1)
    expect(parseEmbedParams(P('view=mini&max=abc')).max).toBe(4)
  })

  it('accent hex valide accepté, sinon défaut', () => {
    expect(parseEmbedParams(P('accent=e74c3c')).accent).toBe('#e74c3c')
    expect(parseEmbedParams(P('accent=zzz')).accent).toBe('#c87941')
  })

  it('maxWidth : full = pleine largeur (null), mini = 360 par défaut', () => {
    expect(parseEmbedParams(P('view=full')).maxWidth).toBeNull()
    expect(parseEmbedParams(P('view=mini')).maxWidth).toBe(360)
  })

  it('maxw explicite est clampé [240,2000] et prime sur le défaut de vue', () => {
    expect(parseEmbedParams(P('view=full&maxw=720')).maxWidth).toBe(720)
    expect(parseEmbedParams(P('view=mini&maxw=500')).maxWidth).toBe(500)
    expect(parseEmbedParams(P('maxw=99')).maxWidth).toBe(240)
    expect(parseEmbedParams(P('maxw=5000')).maxWidth).toBe(2000)
    expect(parseEmbedParams(P('view=full&maxw=abc')).maxWidth).toBeNull()
  })
})
