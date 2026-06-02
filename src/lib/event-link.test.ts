import { describe, it, expect } from 'vitest'
import { eventPath, eventShareUrl } from './event-link'

describe('eventPath', () => {
  it('utilise /e/{slug} quand un slug existe', () => {
    expect(eventPath({ slug: 'foire-medievale-de-provins', id: 'uuid-1' }))
      .toBe('/e/foire-medievale-de-provins')
  })

  it('retombe sur /evenement/{id} si pas de slug', () => {
    expect(eventPath({ slug: null, id: 'uuid-1' })).toBe('/evenement/uuid-1')
  })
})

describe('eventShareUrl', () => {
  it('utilise /e/{slug} quand un slug existe', () => {
    expect(eventShareUrl({ slug: 'foire-medievale-de-provins', id: 'uuid-1' }, 'https://flw.sh'))
      .toBe('https://flw.sh/e/foire-medievale-de-provins')
  })

  it('retombe sur /evenement/{id} si pas de slug', () => {
    expect(eventShareUrl({ slug: null, id: 'uuid-1' }, 'https://flw.sh'))
      .toBe('https://flw.sh/evenement/uuid-1')
  })
})
