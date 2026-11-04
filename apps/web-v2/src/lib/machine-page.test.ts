/**
 * QUOI     — tests de lib/machine-page.ts : la page qu'un agent IA lit sans JavaScript.
 * POURQUOI — ce HTML part tel quel aux machines : une balise mal échappée y serait une faille, un
 *            fait manquant une ligne fausse citée par une IA.
 */
import {
  eventPage,
  injectPage,
  restoreShell,
  selectionPage,
  type MachineEvent,
} from './machine-page'
import type { Selection } from './selection'

const INDEX = `<!doctype html><html lang="fr"><head><meta charset="UTF-8" /><meta
      name="description"
      content="L'annuaire pro des exposants." /><title>Festivals · Fellowship</title></head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>`

const VAULRUZ: MachineEvent = {
  id: '27bb',
  slug: 'fete-medievale-de-vaulruz-2026',
  name: 'Fête médiévale de Vaulruz',
  city: 'Vaulruz',
  department: 'Fribourg',
  country: 'CH',
  start_date: '2026-12-05',
  end_date: '2026-12-06',
  registration_deadline: '2026-11-20',
  registration_url: 'https://www.arbor-living-history.ch/exposants',
  stand_price: '100 CHF',
  stand_size: '3×3',
  image_url: 'https://exemple.supabase.co/vaulruz.webp',
  expected_attendance: null,
  edition: null,
  tags: ['fete-medievale'],
  interested: 2,
  registered: 1,
  rating: 4.2,
  rating_count: 3,
  description: '<p>La <strong>légende</strong> des lutins.</p>',
  address: 'Château de Vaulruz, 1627 Vaulruz, Suisse',
  latitude: 46.62,
  longitude: 6.99,
}

function ldOf(html: string): Record<string, unknown> {
  const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)?.[1] ?? '{}'
  return JSON.parse(json) as Record<string, unknown>
}

describe('eventPage', () => {
  it('titre la fiche par son nom, son année et sa ville', () => {
    expect(eventPage(VAULRUZ).title).toBe('Fête médiévale de Vaulruz 2026 · Vaulruz · Fellowship')
  })

  it('décrit la fiche en faits', () => {
    const { description } = eventPage(VAULRUZ)
    expect(description).toContain('Du samedi 5 au dimanche 6 décembre 2026')
    expect(description).toContain('Vaulruz')
    expect(description).toContain('Stand 3×3 à 100 CHF')
    expect(description).toContain('candidatures jusqu’au 20 novembre')
  })

  it('donne aux machines un Event schema.org', () => {
    const ld = eventPage(VAULRUZ).jsonLd as Record<string, unknown>
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Fête médiévale de Vaulruz',
      startDate: '2026-12-05',
      endDate: '2026-12-06',
      image: 'https://exemple.supabase.co/vaulruz.webp',
      url: 'https://flw.sh/evenements/fete-medievale-de-vaulruz-2026',
      location: {
        '@type': 'Place',
        name: 'Vaulruz',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Château de Vaulruz, 1627 Vaulruz, Suisse',
          addressLocality: 'Vaulruz',
          addressCountry: 'CH',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 46.62, longitude: 6.99 },
      },
      offers: { '@type': 'Offer', url: 'https://www.arbor-living-history.ch/exposants' },
    })
  })

  it('écrit le corps en clair : faits, note et texte sans balises de la fiche', () => {
    const { body } = eventPage(VAULRUZ)
    expect(body).toContain('<h1>Fête médiévale de Vaulruz 2026</h1>')
    expect(body).toContain('Note des exposants : 4,2 / 5 (3 avis)')
    expect(body).toContain('La légende des lutins.')
    expect(body).not.toContain('<strong>')
  })

  it('ne dit pas un pays qu’elle ne connaît pas', () => {
    // Une fiche suisse saisie par le formulaire arrive en « FR » avec un canton : ni l'un ni l'autre
    // ne se lit, on se tait plutôt que d'affirmer la France.
    const unknown = eventPage({ ...VAULRUZ, country: 'FR', department: 'Fribourg' })
    expect(JSON.stringify(unknown.jsonLd)).not.toContain('addressCountry')
    const french = eventPage({ ...VAULRUZ, country: 'FR', department: '81' })
    expect(JSON.stringify(french.jsonLd)).toContain('"addressCountry":"FR"')
  })

  it('décode les entités d’une description riche', () => {
    const { body, description } = eventPage({
      ...VAULRUZ,
      description: '<p>Arts &amp; métiers&nbsp;: «&#160;lutins&#39;&nbsp;»</p>',
    })
    expect(description).toContain("Arts & métiers : « lutins' »")
    expect(body).toContain('Arts &amp; métiers : « lutins&#39; »')
    expect(body).not.toContain('&amp;amp;')
  })

  it('tient une fiche à moitié remplie sans trou', () => {
    const bare: MachineEvent = {
      ...VAULRUZ,
      registration_deadline: null,
      registration_url: null,
      stand_price: null,
      stand_size: null,
      image_url: null,
      rating: null,
      rating_count: 0,
      description: null,
      address: null,
      latitude: null,
      longitude: null,
    }
    const page = eventPage(bare)
    const all = page.title + page.description + page.body + JSON.stringify(page.jsonLd)
    expect(all).not.toMatch(/undefined|null|NaN/)
    expect(page.image).toBeNull()
    expect(page.jsonLd).not.toHaveProperty('offers')
  })
})

describe('selectionPage', () => {
  const selection: Selection = {
    title:
      'Les fêtes médiévales immanquables pour un exposant en Suisse en 2026 — la sélection Fellowship',
    season: 2026,
    top: [VAULRUZ],
    others: [{ ...VAULRUZ, id: 'autre', slug: 'autre-2026', name: 'Autre fête' }],
  }

  it('liste le top puis les autres, chaque ligne liée à sa fiche', () => {
    const page = selectionPage(selection, '/festivals/fete-medievale/suisse')
    expect(page.body).toContain(`<h1>${selection.title}</h1>`)
    expect(page.body.indexOf('/evenements/fete-medievale-de-vaulruz-2026')).toBeLessThan(
      page.body.indexOf('/evenements/autre-2026'),
    )
    expect(page.body).toContain('Stand 3×3 à 100 CHF')
    expect(page.canonical).toBe('https://flw.sh/festivals/fete-medievale/suisse')
  })

  it('donne aux machines une ItemList d’Event, dans l’ordre', () => {
    const ld = selectionPage(selection, '/festivals/fete-medievale/suisse').jsonLd
    expect(ld).toMatchObject({
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          item: { '@type': 'Event', name: 'Fête médiévale de Vaulruz' },
        },
        { '@type': 'ListItem', position: 2, item: { '@type': 'Event', name: 'Autre fête' } },
      ],
    })
  })
})

describe('injectPage', () => {
  it('pose la tête, le JSON-LD et le corps dans la coque de l’application', () => {
    const html = injectPage(INDEX, eventPage(VAULRUZ))
    expect(html).toContain('<title>Fête médiévale de Vaulruz 2026 · Vaulruz · Fellowship</title>')
    expect(html).not.toContain('<title>Festivals · Fellowship</title>')
    expect(html).not.toContain('L&#39;annuaire pro') // l'ancienne description est remplacée
    expect(html).not.toContain("L'annuaire pro")
    expect(html).toContain('<meta property="og:title"')
    expect(html).toContain(
      '<meta property="og:image" content="https://exemple.supabase.co/vaulruz.webp"',
    )
    expect(html).toContain(
      '<link rel="canonical" href="https://flw.sh/evenements/fete-medievale-de-vaulruz-2026"',
    )
    expect(ldOf(html)).toMatchObject({ '@type': 'Event' })
    expect(html).toContain('<div id="root"><main>')
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>')
  })

  it('garde tel quel un « $ » saisi dans une fiche', () => {
    const html = injectPage(INDEX, eventPage({ ...VAULRUZ, stand_price: "50 $& $' $$" }))
    expect(html).toContain('Stand 3×3 à 50 $&amp; $&#39; $$')
  })

  it('ne garde que les liens http(s) saisis dans une fiche', () => {
    const page = eventPage({
      ...VAULRUZ,
      registration_url: 'javascript:alert(1)',
      image_url: 'data:text/html,<b>x</b>',
    })
    const all = page.body + JSON.stringify(page.jsonLd) + String(page.image)
    expect(all).not.toContain('javascript:')
    expect(all).not.toContain('data:')
    expect(page.jsonLd).not.toHaveProperty('offers')
  })

  it('échappe un texte hostile partout', () => {
    const hostile = { ...VAULRUZ, name: '</script><img src=x onerror=alert(1)>', city: '"><b>x' }
    const html = injectPage(INDEX, eventPage(hostile))
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('"><b>')
    expect(html.match(/<\/script>/g)).toHaveLength(2) // le JSON-LD et le module, rien d'autre
    expect(ldOf(html)).toMatchObject({ name: '</script><img src=x onerror=alert(1)>' })
  })
})

describe('restoreShell', () => {
  it('rend à l’application le titre de la coque et retire la tête de la fiche', () => {
    const html = injectPage(INDEX, eventPage(VAULRUZ))
    const doc = new DOMParser().parseFromString(html, 'text/html')
    restoreShell(doc)
    expect(doc.title).toBe('Festivals · Fellowship')
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()
    expect(doc.querySelector('meta[property="og:title"]')).toBeNull()
  })

  it('ne touche pas une page servie sans fiche', () => {
    const doc = new DOMParser().parseFromString(INDEX, 'text/html')
    restoreShell(doc)
    expect(doc.title).toBe('Festivals · Fellowship')
  })
})
