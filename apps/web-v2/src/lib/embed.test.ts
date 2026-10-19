/**
 * QUOI     — tests de lib/embed.ts : les réglages du calendrier intégré et ses dates.
 * POURQUOI — les réglages viennent de l'adresse collée sur le site d'un artiste : ils ne doivent
 *            jamais casser le calendrier, quoi qu'on y écrive.
 */
import { parseEmbedParams, upcomingEmbedDates } from './embed'

const P = (qs: string) => new URLSearchParams(qs)

describe('parseEmbedParams', () => {
  it('sans réglage : clair, toutes les dates, cuivre, pleine largeur, 4 visibles, en-tête', () => {
    expect(parseEmbedParams(P(''))).toEqual({
      theme: 'light',
      max: null,
      accent: '#c87941',
      maxWidth: null,
      preview: 4,
      showHeader: true,
    })
  })

  it('preview : 4 par défaut, borné à [0, 50], 0 = tout afficher', () => {
    expect(parseEmbedParams(P('preview=8')).preview).toBe(8)
    expect(parseEmbedParams(P('preview=0')).preview).toBe(0)
    expect(parseEmbedParams(P('preview=999')).preview).toBe(50)
    expect(parseEmbedParams(P('preview=-3')).preview).toBe(0)
    expect(parseEmbedParams(P('preview=abc')).preview).toBe(4)
  })

  it('header=0 masque l’en-tête', () => {
    expect(parseEmbedParams(P('header=0')).showHeader).toBe(false)
    expect(parseEmbedParams(P('header=1')).showHeader).toBe(true)
  })

  it('theme : dark, auto, sinon clair', () => {
    expect(parseEmbedParams(P('theme=dark')).theme).toBe('dark')
    expect(parseEmbedParams(P('theme=auto')).theme).toBe('auto')
    expect(parseEmbedParams(P('theme=neon')).theme).toBe('light')
  })

  it('max : toutes par défaut, sinon borné à [1, 50]', () => {
    expect(parseEmbedParams(P('max=2')).max).toBe(2)
    expect(parseEmbedParams(P('max=999')).max).toBe(50)
    expect(parseEmbedParams(P('max=0')).max).toBe(1)
    expect(parseEmbedParams(P('max=abc')).max).toBeNull()
  })

  it('accent : un hexadécimal valide, sinon le cuivre', () => {
    expect(parseEmbedParams(P('accent=e74c3c')).accent).toBe('#e74c3c')
    expect(parseEmbedParams(P('accent=zzz')).accent).toBe('#c87941')
  })

  it('maxw : pleine largeur par défaut, sinon borné à [240, 2000]', () => {
    expect(parseEmbedParams(P('maxw=720')).maxWidth).toBe(720)
    expect(parseEmbedParams(P('maxw=99')).maxWidth).toBe(240)
    expect(parseEmbedParams(P('maxw=5000')).maxWidth).toBe(2000)
    expect(parseEmbedParams(P('maxw=abc')).maxWidth).toBeNull()
  })
})

describe('upcomingEmbedDates', () => {
  const today = new Date(2026, 9, 19)
  const date = (id: string, start: string, isPrivate = false) => ({
    id,
    start_date: start,
    is_private: isPrivate,
  })

  it('garde les dates publiques d’aujourd’hui ou après, de la plus proche à la plus lointaine', () => {
    const rows = [
      date('loin', '2027-03-01'),
      date('passee', '2026-10-18'),
      date('privee', '2026-11-01', true),
      date('aujourdhui', '2026-10-19'),
    ]
    expect(upcomingEmbedDates(rows, today, null).map((row) => row.id)).toEqual([
      'aujourdhui',
      'loin',
    ])
  })

  it('max coupe la liste', () => {
    const rows = [date('a', '2026-11-01'), date('b', '2026-12-01')]
    expect(upcomingEmbedDates(rows, today, 1).map((row) => row.id)).toEqual(['a'])
  })
})
