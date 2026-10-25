/**
 * QUOI     — tests de la lecture du fil de la communauté et de ses phrases.
 * POURQUOI — le fil mêle cinq sortes de lignes, dont des avis à identité protégée : une ligne mal
 *            lue ne doit ni casser l'écran, ni nommer qui ne doit pas l'être.
 */
import { describe, expect, test } from 'vitest'
import {
  activityText,
  canFollow,
  feedFor,
  feedPhrase,
  followReason,
  gatheringOf,
  mutualLabel,
  readFeed,
  readFollowReason,
  readPeople,
  readTab,
  appendPage,
  pageCursor,
  type FeedLine,
} from './community'

const event = {
  event_id: 'e1',
  event_name: 'Les Aventuriales',
  event_city: 'Ménétrole',
  event_department: '63',
  event_start: '2026-09-25',
  event_end: '2026-09-27',
  event_image: null,
}

function row(kind: string, extra: Record<string, unknown> = {}) {
  return {
    id: `${kind}:1`,
    kind,
    occurred_at: '2026-10-11T08:00:00Z',
    who_id: 'a1',
    who_name: 'Gautier',
    who_avatar: null,
    who_slug: 'gautier',
    target_id: null,
    target_name: null,
    target_slug: null,
    event_id: null,
    event_name: null,
    event_city: null,
    event_department: null,
    event_start: null,
    event_end: null,
    event_image: null,
    stars: null,
    comment: null,
    detail: null,
    companions: null,
    ...extra,
  }
}

function line(kind: string, extra: Record<string, unknown> = {}): FeedLine {
  const [read] = readFeed([row(kind, extra)])
  if (!read) throw new Error(`ligne ${kind} illisible`)
  return read
}

describe('readFeed', () => {
  test('lit une ligne « va à » avec son festival', () => {
    const read = line('going', event)
    expect(read.kind).toBe('going')
    expect(read.at).toEqual(new Date('2026-10-11T08:00:00Z'))
    expect(read.who).toEqual({ id: 'a1', name: 'Gautier', avatarUrl: null, slug: 'gautier' })
    expect(read.event?.name).toBe('Les Aventuriales')
    expect(line('going', { ...event, event_tags: ['Geek', 3] }).event?.tags).toEqual(['Geek'])
  })

  test('un auteur masqué par la base reste inconnu', () => {
    expect(line('review', { ...event, who_id: null, who_name: null }).who).toBeNull()
  })

  test('les compagnons de « Ça se rassemble »', () => {
    const read = line('gathering', {
      ...event,
      who_id: null,
      who_name: null,
      detail: '3',
      companions: [{ id: 'c1', name: 'Lina', avatar: null }],
    })
    expect(read.companions).toEqual([{ id: 'c1', name: 'Lina', avatarUrl: null, slug: null }])
  })

  test('une ligne inconnue ou incomplète est ignorée, pas le fil', () => {
    const rows = [row('inconnu'), row('going'), row('going', event), null, 'x']
    expect(readFeed(rows)).toHaveLength(1)
    expect(readFeed(null)).toEqual([])
  })

  test('les espaces saisies autour d’un nom sont retirées', () => {
    expect(line('going', { ...event, event_name: 'HeroFestival ' }).event?.name).toBe(
      'HeroFestival',
    )
  })
})

describe('les onglets', () => {
  const lines = [
    line('arrival'),
    line('going', event),
    line('added', event),
    line('review', event),
    line('follow', { target_id: 't1', target_name: 'Forge Lugdunum' }),
    line('gathering', { ...event, detail: '3' }),
  ]
  const kinds = (tab: Parameters<typeof feedFor>[1]) => feedFor(lines, tab).map((l) => l.kind)

  test('chaque onglet garde ses lignes, jamais « Ça se rassemble »', () => {
    expect(kinds('tout')).toEqual(['arrival', 'going', 'added', 'review', 'follow'])
    expect(kinds('ou')).toEqual(['going', 'added'])
    expect(kinds('avis')).toEqual(['review'])
    expect(kinds('reseau')).toEqual(['arrival', 'follow'])
  })

  test('« Ça se rassemble » à part', () => {
    expect(gatheringOf(lines)?.kind).toBe('gathering')
    expect(gatheringOf([])).toBeNull()
  })

  test('l’onglet se lit dans l’adresse', () => {
    expect(readTab('avis')).toBe('avis')
    expect(readTab('ou')).toBe('ou')
    expect(readTab('reseau')).toBe('reseau')
    expect(readTab('x')).toBe('tout')
    expect(readTab(null)).toBe('tout')
  })
})

describe('feedPhrase', () => {
  test('une arrivée, avec ou sans détail', () => {
    expect(feedPhrase(line('arrival', { detail: 'maroquinerie, Nantes' }))).toEqual([
      { strong: 'Gautier' },
      ' vient de rejoindre Fellowship — maroquinerie, Nantes.',
    ])
    expect(feedPhrase(line('arrival'))).toEqual([
      { strong: 'Gautier' },
      ' vient de rejoindre Fellowship.',
    ])
  })

  test('va à', () => {
    expect(feedPhrase(line('going', event))).toEqual([
      { strong: 'Gautier' },
      ' va à ',
      { strong: 'Les Aventuriales' },
      '.',
    ])
  })

  test('un festival ajouté, par quelqu’un de connu ou non', () => {
    expect(feedPhrase(line('added', event))).toEqual([
      { strong: 'Gautier' },
      ' a ajouté un festival sur Fellowship.',
    ])
    expect(feedPhrase(line('added', { ...event, who_id: null, who_name: null }))).toEqual([
      { strong: 'Quelqu’un' },
      ' a ajouté un festival sur Fellowship.',
    ])
  })

  test('un avis : « Un exposant » sauf pour un ami', () => {
    const anonymous = line('review', { ...event, who_id: null, who_name: null })
    expect(feedPhrase(anonymous)).toEqual([
      { strong: 'Un exposant' },
      ' a noté ',
      { strong: 'Les Aventuriales' },
      '.',
    ])
    expect(feedPhrase(line('review', event))[0]).toEqual({ strong: 'Gautier' })
  })

  test('suit maintenant', () => {
    expect(feedPhrase(line('follow', { target_id: 't1', target_name: 'Forge Lugdunum' }))).toEqual([
      { strong: 'Gautier' },
      ' suit maintenant ',
      { strong: 'Forge Lugdunum' },
      '.',
    ])
  })
})

describe('activityText (barre latérale)', () => {
  test('les lignes du réseau', () => {
    const aventuriales = { name: 'Les Aventuriales', to: '/evenements/e1' }
    expect(activityText(line('arrival'))).toEqual({
      verb: 'vient de rejoindre Fellowship',
      object: null,
    })
    expect(activityText(line('going', event))).toEqual({ verb: 'va à', object: aventuriales })
    expect(activityText(line('added', event))).toEqual({ verb: 'a ajouté', object: aventuriales })
    expect(
      activityText(
        line('follow', { target_id: 't1', target_name: 'Forge Lugdunum', target_slug: 'forge' }),
      ),
    ).toEqual({ verb: 'suit', object: { name: 'Forge Lugdunum', to: '/forge' } })
  })

  test('un compte suivi sans vitrine reste du texte', () => {
    expect(
      activityText(line('follow', { target_id: 't1', target_name: 'Forge Lugdunum' }))?.object,
    ).toEqual({ name: 'Forge Lugdunum', to: null })
  })

  test('ni avis, ni rassemblement, ni auteur inconnu', () => {
    expect(activityText(line('review', event))).toBeNull()
    expect(activityText(line('gathering', { ...event, detail: '3' }))).toBeNull()
    expect(activityText(line('added', { ...event, who_id: null, who_name: null }))).toBeNull()
  })
})

describe('followReason', () => {
  test.each([
    [{ kind: 'followed_by', name: 'Tom', others: 0 }, 'suivi par Tom'],
    [{ kind: 'followed_by', name: 'Tom', others: 1 }, 'suivi par Tom et 1 autre'],
    [{ kind: 'followed_by', name: 'Tom', others: 2 }, 'suivi par Tom et 2 autres'],
    [{ kind: 'shared_dates', count: 8 }, '8 dates en commun'],
    [{ kind: 'shared_dates', count: 1 }, '1 date en commun'],
    [{ kind: 'nearby' }, 'nouveau sur Fellowship'],
  ])('%o → %s', (raw, expected) => {
    const reason = readFollowReason(raw)
    expect(reason).not.toBeNull()
    if (reason) expect(followReason(reason)).toBe(expected)
  })

  test('une raison illisible', () => {
    expect(readFollowReason({ kind: 'x' })).toBeNull()
    expect(readFollowReason(null)).toBeNull()
  })
})

test('canFollow : jamais un compte suivi, jamais un des siens', () => {
  const followed = new Set(['f1'])
  const own = new Set(['me', 'shop'])
  expect(canFollow('f1', followed, own)).toBe(false)
  expect(canFollow('shop', followed, own)).toBe(false)
  expect(canFollow('other', followed, own)).toBe(true)
})

test('readPeople : des visages lus, les illisibles ignorés', () => {
  expect(
    readPeople([{ id: 'a', name: ' Lina ', avatar: null }, { id: 'b', name: '' }, 'x']),
  ).toEqual([{ id: 'a', name: 'Lina', avatarUrl: null, slug: null }])
  expect(readPeople(null)).toEqual([])
})

describe('les pages du fil', () => {
  const at = (iso: string, id: string) => line('arrival', { id, occurred_at: iso })
  const first = [
    line('gathering', { ...event, detail: '3' }),
    at('2026-10-11T08:00:00Z', 'a'),
    at('2026-10-10T08:00:00Z', 'b'),
  ]

  test('la page suivante part de la plus ancienne nouvelle, jamais du rassemblement', () => {
    expect(pageCursor(first)).toBe('2026-10-10T08:00:00.000Z')
    expect(pageCursor([])).toBeNull()
  })

  test('les anciennes s’ajoutent au bout, sans doublon ; une page pleine en annonce une autre', () => {
    const next = [at('2026-10-10T08:00:00Z', 'b'), at('2026-10-09T08:00:00Z', 'c')]
    const page = appendPage(first, next, 2)
    expect(page.lines.map((l) => l.id)).toEqual(['gathering:1', 'a', 'b', 'c'])
    expect(page.hasMore).toBe(true)
    expect(appendPage(first, [at('2026-10-09T08:00:00Z', 'c')], 2).hasMore).toBe(false)
  })
})

describe('mutualLabel', () => {
  test('le nombre d’amis en commun, au singulier comme au pluriel', () => {
    expect(mutualLabel(1)).toBe('1 ami en commun')
    expect(mutualLabel(3)).toBe('3 amis en commun')
  })
})
