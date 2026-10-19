/**
 * QUOI     — les tests de l'adresse d'une affiche servie par le stockage.
 * POURQUOI — une adresse mal réécrite, et toutes les affiches de l'app disparaissent.
 */
import { describe, expect, it } from 'vitest'
import { posterThumb } from './poster-thumb'

describe('posterThumb', () => {
  it('demande au stockage une miniature de l’image entière, sans la découper', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/event-images/a.webp'
    expect(posterThumb(url, 40)).toBe(
      'https://x.supabase.co/storage/v1/render/image/public/event-images/a.webp?width=40&resize=contain&quality=60',
    )
  })

  it('garde la qualité d’une affiche qu’on lit', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/event-images/a.jpg'
    expect(posterThumb(url, 800, 80)).toBe(
      'https://x.supabase.co/storage/v1/render/image/public/event-images/a.jpg?width=800&resize=contain&quality=80',
    )
  })

  it('laisse intacte une affiche hébergée ailleurs', () => {
    expect(posterThumb('https://ailleurs.fr/a.jpg', 40)).toBe('https://ailleurs.fr/a.jpg')
  })
})
