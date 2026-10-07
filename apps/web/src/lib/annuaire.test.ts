// src/lib/annuaire.test.ts
import { describe, it, expect } from 'vitest'
import {
  toPublicList, applicationStatus, formatWhen, searchEvents, countCounters, toCard, todayIso, topUniverses,
  countWithApplications, searchScopeLabel, ctaCountsSentence, resultsLabel,
} from './annuaire'
import type { PublicEvent } from './annuaire'

const TODAY = new Date('2026-08-11T00:00:00Z')

function ev(over: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: 'x', name: 'Fête médiévale', slug: 'fete-medievale-provins', city: 'Provins',
    department: '77', start_date: '2026-09-12', end_date: '2026-09-13',
    image_url: null, tags: ['fete-medievale'], registration_url: null,
    registration_deadline: null, is_private: false, ...over,
  }
}

describe('toPublicList', () => {
  it('exclut les événements privés', () => {
    const list = toPublicList([ev(), ev({ id: 'p', is_private: true })], TODAY)
    expect(list.map(e => e.id)).toEqual(['x'])
  })
  it('exclut ce qui est déjà terminé, garde ce qui est en cours', () => {
    const fini = ev({ id: 'fini', start_date: '2026-07-01', end_date: '2026-07-03' })
    const encours = ev({ id: 'encours', start_date: '2026-08-09', end_date: '2026-08-13' })
    expect(toPublicList([fini, encours], TODAY).map(e => e.id)).toEqual(['encours'])
  })
  it('trie par date de début croissante', () => {
    const tard = ev({ id: 'tard', start_date: '2026-12-01', end_date: '2026-12-02' })
    const tot = ev({ id: 'tot', start_date: '2026-08-20', end_date: '2026-08-21' })
    expect(toPublicList([tard, tot], TODAY).map(e => e.id)).toEqual(['tot', 'tard'])
  })
})

describe('applicationStatus', () => {
  it('sans lien ni date limite → info neutre', () => {
    expect(applicationStatus(ev(), TODAY)).toEqual({ kind: 'info', label: 'Voir la fiche' })
  })
  it('lien de candidature sans date limite → ouvertes', () => {
    expect(applicationStatus(ev({ registration_url: 'https://x.fr' }), TODAY))
      .toEqual({ kind: 'open', label: 'Candidatures ouvertes' })
  })
  it('date limite dans 9 jours → clôture imminente', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-20' }), TODAY))
      .toEqual({ kind: 'soon', label: 'Clôture dans 9 jours' })
  })
  it('date limite demain → singulier', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-12' }), TODAY))
      .toEqual({ kind: 'soon', label: 'Clôture dans 1 jour' })
  })
  it('date limite aujourd’hui → clôture aujourd’hui', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-11' }), TODAY))
      .toEqual({ kind: 'soon', label: 'Clôture aujourd’hui' })
  })
  it('date limite dépassée → candidatures closes', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-08-01', registration_url: 'https://x.fr' }), TODAY))
      .toEqual({ kind: 'info', label: 'Candidatures closes' })
  })
  it('date limite lointaine → ouvertes', () => {
    expect(applicationStatus(ev({ registration_deadline: '2026-11-01' }), TODAY))
      .toEqual({ kind: 'open', label: 'Candidatures ouvertes' })
  })
})

describe('formatWhen', () => {
  it('deux jours du même mois → « 12 – 13 septembre · Provins »', () => {
    expect(formatWhen(ev())).toBe('12 – 13 septembre · Provins')
  })
  it('à cheval sur deux mois → les deux mois sont nommés', () => {
    expect(formatWhen(ev({ start_date: '2026-10-30', end_date: '2026-11-02' })))
      .toBe('30 octobre – 2 novembre · Provins')
  })
  it('un seul jour → pas de tiret', () => {
    expect(formatWhen(ev({ start_date: '2026-09-12', end_date: '2026-09-12' })))
      .toBe('12 septembre · Provins')
  })
  it('sans ville → seulement les dates', () => {
    expect(formatWhen(ev({ city: null }))).toBe('12 – 13 septembre')
  })
})

describe('searchEvents', () => {
  const list = [ev(), ev({ id: 'n', name: 'Marché de Noël', city: 'Colmar' })]
  it('requête vide → tout', () => {
    expect(searchEvents(list, '  ')).toHaveLength(2)
  })
  it('cherche dans le nom, sans casse ni accents', () => {
    expect(searchEvents(list, 'MARCHE DE NOEL').map(e => e.id)).toEqual(['n'])
  })
  it('cherche dans la ville', () => {
    expect(searchEvents(list, 'provins').map(e => e.id)).toEqual(['x'])
  })
})

describe('countCounters', () => {
  it('compte les vrais nombres, jamais de chiffre inventé', () => {
    const list = [ev(), ev({ id: 'b', registration_url: 'https://x.fr' })]
    expect(countCounters(list, 84)).toEqual([
      { n: '2', label: 'événements à venir' },
      { n: '1', label: 'prend des exposants' },
      { n: '84', label: 'exposants inscrits' },
    ])
  })
  it('accorde le libellé au pluriel', () => {
    const list = [ev({ id: 'a', registration_url: 'https://x.fr' }), ev({ id: 'b', registration_url: 'https://y.fr' })]
    expect(countCounters(list, 2)[1]).toEqual({ n: '2', label: 'prennent des exposants' })
  })
  it('compte des exposants inconnu → la troisième pastille disparaît', () => {
    expect(countCounters([ev()], null)).toHaveLength(2)
  })
  it('lecture ratée (liste inconnue) → aucun compteur d’événements, jamais un zéro', () => {
    // Une lecture qui échoue n'est pas « 0 événement » : on se tait.
    expect(countCounters(null, 84)).toEqual([{ n: '84', label: 'exposants inscrits' }])
  })
  it('lecture ratée et compte d’exposants inconnu → plus aucune pastille', () => {
    expect(countCounters(null, null)).toEqual([])
  })
})

describe('countWithApplications', () => {
  it('compte les événements avec URL de candidature ou date limite', () => {
    const list = [
      ev({ id: 'a', registration_url: 'https://x.fr' }),
      ev({ id: 'b', registration_deadline: '2026-09-01' }),
      ev({ id: 'c' }),
    ]
    expect(countWithApplications(list)).toBe(2)
  })
  it('liste vide → zéro', () => {
    expect(countWithApplications([])).toBe(0)
  })
  it('même prédicat que la deuxième pastille de countCounters', () => {
    const list = [ev({ id: 'a', registration_url: 'https://x.fr' }), ev({ id: 'b' })]
    expect(countCounters(list, null)[1].n).toBe(String(countWithApplications(list)))
  })
})

describe('searchScopeLabel', () => {
  it('accorde le pluriel', () => {
    expect(searchScopeLabel(42)).toBe('Chercher dans 42 événements')
  })
  it('un seul événement → singulier', () => {
    expect(searchScopeLabel(1)).toBe('Chercher dans 1 événement')
  })
  it('lecture ratée → la phrase perd son nombre, pas sa promesse', () => {
    expect(searchScopeLabel(null)).toBe('Chercher dans l’annuaire')
  })
})

describe('ctaCountsSentence', () => {
  it('accorde les deux nombres', () => {
    const list = [ev({ id: 'a', registration_url: 'https://x.fr' }), ev({ id: 'b' })]
    expect(ctaCountsSentence(list)).toBe('2 événements à venir, 1 qui prend des exposants.')
  })
  it('un seul de chaque → tout au singulier', () => {
    expect(ctaCountsSentence([ev({ registration_url: 'https://x.fr' })]))
      .toBe('1 événement à venir, 1 qui prend des exposants.')
  })
  it('plusieurs qui prennent des exposants → « prennent »', () => {
    const list = [ev({ id: 'a', registration_url: 'https://x.fr' }), ev({ id: 'b', registration_deadline: '2026-09-01' })]
    expect(ctaCountsSentence(list)).toBe('2 événements à venir, 2 qui prennent des exposants.')
  })
  it('lecture ratée → aucune phrase chiffrée', () => {
    expect(ctaCountsSentence(null)).toBeNull()
  })
})

describe('resultsLabel', () => {
  it('aucun résultat', () => {
    expect(resultsLabel(0)).toBe('Aucun événement ne correspond')
  })
  it('un seul résultat → singulier', () => {
    expect(resultsLabel(1)).toBe('1 événement trouvé')
  })
  it('plusieurs résultats → pluriel', () => {
    expect(resultsLabel(7)).toBe('7 événements trouvés')
  })
})

describe('topUniverses', () => {
  it('compte par premier tag et trie par nombre décroissant', () => {
    const list = [
      ev({ id: 'a', tags: ['medieval'] }),
      ev({ id: 'b', tags: ['medieval'] }),
      ev({ id: 'c', tags: ['noel'] }),
    ]
    expect(topUniverses(list)).toEqual(['medieval', 'noel'])
  })
  it('ignore les événements sans tag', () => {
    expect(topUniverses([ev({ tags: null }), ev({ tags: [] })])).toEqual([])
  })
  it('plafonne au nombre demandé', () => {
    const list = ['a', 'b', 'c', 'd'].map(slug => ev({ id: slug, tags: [slug] }))
    expect(topUniverses(list, 2)).toHaveLength(2)
  })
  it('un univers absent des événements à venir ne peut pas apparaître', () => {
    const list = [ev({ id: 'a', tags: ['medieval'] })]
    expect(topUniverses(list)).not.toContain('fantasy')
  })
  it('plafond par défaut à 8, en respectant le tri décroissant (pas d\'appel avec limit)', () => {
    // 9 univers distincts, comptes tous différents : le 9e (le moins
    // fréquent) doit être coupé, et l'ordre des 8 retenus doit suivre le
    // compte décroissant — pas seulement leur nombre.
    const counts: Array<[string, number]> = [
      ['medieval', 9], ['fantasy', 8], ['geek', 7], ['tatouage', 6],
      ['noel', 5], ['musique', 4], ['livre', 3], ['brocante', 2], ['biker', 1],
    ]
    const list = counts.flatMap(([slug, n]) =>
      Array.from({ length: n }, (_, i) => ev({ id: `${slug}-${i}`, tags: [slug] })))
    expect(topUniverses(list)).toEqual([
      'medieval', 'fantasy', 'geek', 'tatouage', 'noel', 'musique', 'livre', 'brocante',
    ])
  })
})

describe('todayIso', () => {
  it('formate en heure locale, jamais via toISOString (UTC)', () => {
    // 11 août 2026, 00h30 heure locale : passer par toISOString() ferait
    // retomber sur la veille en UTC dans tout fuseau positif (UTC+1/+2) —
    // exactement le bug que ce helper existe pour éviter.
    const justAfterMidnight = new Date(2026, 7, 11, 0, 30)
    // Garde-fou du garde-fou : sur un runner en UTC, toISOString() renverrait
    // le MÊME jour et ce test passerait contre le bug qu'il surveille. Le
    // fuseau est épinglé (TZ=Europe/Paris, vitest.config.ts) — cette première
    // assertion échoue bruyamment si l'épinglage saute.
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe('2026-08-10')
    expect(todayIso(justAfterMidnight)).toBe('2026-08-11')
  })
  it('complète les zéros du mois et du jour', () => {
    expect(todayIso(new Date(2026, 0, 5, 14, 0))).toBe('2026-01-05')
  })
})

describe('toCard', () => {
  it('événement avec slug → href vers /e/<slug>', () => {
    expect(toCard(ev(), TODAY, {}).href).toBe('/e/fete-medievale-provins')
  })
  it('événement sans slug → href de repli vers /evenement/<id>', () => {
    expect(toCard(ev({ slug: null }), TODAY, {}).href).toBe('/evenement/x')
  })
  it('tag connu → emoji + libellé de la table, couleur du tag', () => {
    const card = toCard(ev({ tags: ['foire'] }), TODAY, { foire: 'Foire artisanale' })
    expect(card.tagSlug).toBe('foire')
    expect(card.tagLabel).toBe('🛠️ Foire artisanale')
    expect(card.tagColor).toBe('#e8c06a')
  })
  it('tag présent mais absent de la table des libellés → repli sur le slug', () => {
    const card = toCard(ev({ tags: ['foire'] }), TODAY, {})
    expect(card.tagLabel).toBe('🛠️ foire')
  })
  it('aucun tag → pas de badge, couleur par défaut', () => {
    const card = toCard(ev({ tags: null }), TODAY, {})
    expect(card.tagSlug).toBeNull()
    expect(card.tagLabel).toBe('')
    expect(card.tagColor).toBe('#e8a06a')
  })
  it('when et status reprennent formatWhen / applicationStatus pour le même événement', () => {
    const e = ev({ registration_url: 'https://x.fr' })
    const card = toCard(e, TODAY, {})
    expect(card.when).toBe(formatWhen(e))
    expect(card.status).toEqual(applicationStatus(e, TODAY))
  })
})
