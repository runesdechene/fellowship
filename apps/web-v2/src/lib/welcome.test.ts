/**
 * QUOI     — tests des règles de l'arrivée : les étapes selon le cas, la validité de chaque étape,
 *            l'adresse tirée de la marque, le département, l'arrondi du mur, les initiales, le code.
 * POURQUOI — lot 10a : une enseigne mal formée ou une seconde enseigne créée par erreur ne se
 *            rattrapent pas ; un chiffre du mur faux se voit dès la porte.
 */
import { describe, expect, test } from 'vitest'
import {
  codeDigits,
  firstProblemStep,
  loginReturning,
  safeReturn,
  typedCode,
  departmentOf,
  EMPTY_DRAFT,
  initialsOf,
  exhibitorReason,
  isAfterCreation,
  referralNote,
  slugFor,
  stepProblem,
  wallCount,
  welcomeSteps,
} from './welcome'

describe('welcomeSteps', () => {
  test('un nouveau compte : la marque, le prénom, le métier, la ville, l’adresse, puis le reste', () => {
    expect(welcomeSteps('new')).toEqual([
      'brand',
      'firstName',
      'craft',
      'place',
      'address',
      'design',
      'festivals',
      'people',
    ])
  })
  test('une enseigne existe déjà : le prénom seul', () => {
    expect(welcomeSteps('nameOnly')).toEqual(['firstName'])
  })
  test('créer un compte exposant : tout sauf le prénom', () => {
    expect(welcomeSteps('newEntity')).toEqual([
      'brand',
      'craft',
      'place',
      'address',
      'design',
      'festivals',
      'people',
    ])
  })
  test('isAfterCreation : les festivals et les exposants, pas le design', () => {
    const steps = welcomeSteps('newEntity')
    expect(isAfterCreation(steps, steps.indexOf('design'))).toBe(false)
    expect(isAfterCreation(steps, steps.indexOf('festivals'))).toBe(true)
  })
  test('les festivals avant les exposants : un festival sert à croiser les gens', () => {
    const steps = welcomeSteps('new')
    expect(steps.indexOf('festivals')).toBeLessThan(steps.indexOf('people'))
  })
})

describe('exhibitorReason', () => {
  test('festivals en commun, métier, région, nouveaux', () => {
    expect(exhibitorReason('festivals', 1)).toBe('1 festival en commun')
    expect(exhibitorReason('festivals', 3)).toBe('3 festivals en commun')
    expect(exhibitorReason('craft', 0)).toBe('Même métier')
    expect(exhibitorReason('nearby', 0)).toBe('Près de chez toi')
    expect(exhibitorReason('recent', 0)).toBe('Nouveau sur Fellowship')
  })
})

describe('referralNote', () => {
  test('inconnu, reconnu, vide', () => {
    expect(referralNote('RUNES9Z3Q', null)).toEqual({
      text: 'Aucun code de parrainage trouvé.',
      tone: 'problem',
    })
    expect(referralNote('RUNESDECHENE', 'Runes de Chêne').text).toBe(
      '✓ Code de Runes de Chêne : ton essai Pro passe à 30 jours si tu l’actives dans tes réglages.',
    )
    expect(referralNote('', undefined).tone).toBeNull()
  })
  test('pendant la vérification, la phrase par défaut', () => {
    expect(referralNote('RUNES', undefined)).toEqual(referralNote('', undefined))
  })
})

describe('stepProblem', () => {
  test('les étapes après l’adresse ne bloquent jamais', () => {
    for (const step of ['design', 'people', 'festivals'] as const)
      expect(stepProblem(step, EMPTY_DRAFT)).toBeNull()
  })
  const draft = { ...EMPTY_DRAFT, brand: 'Atelier Sauvage', firstName: 'Uriel' }
  test('la marque et le prénom sont obligatoires, 60 caractères au plus', () => {
    expect(stepProblem('brand', { ...draft, brand: '  ' })).toBe('Le nom de ta marque')
    expect(stepProblem('brand', { ...draft, brand: 'a'.repeat(61) })).toBe('60 caractères au plus')
    expect(stepProblem('firstName', { ...draft, firstName: '' })).toBe('Ton prénom')
    expect(stepProblem('brand', draft)).toBeNull()
  })
  test('le métier est facultatif', () => {
    expect(stepProblem('craft', draft)).toBeNull()
    expect(stepProblem('craft', { ...draft, craft: 'a'.repeat(61) })).toBe('60 caractères au plus')
  })
  test('le code postal : cinq chiffres ou rien', () => {
    expect(stepProblem('place', { ...draft, postalCode: '6300' })).toBe('Cinq chiffres')
    expect(stepProblem('place', { ...draft, postalCode: '63000' })).toBeNull()
    expect(stepProblem('place', draft)).toBeNull()
  })
  test('l’adresse suit les règles de la vitrine', () => {
    expect(stepProblem('address', { ...draft, slug: 'ab', slugTouched: true })).toBe(
      'Au moins 3 caractères',
    )
    expect(stepProblem('address', draft)).toBeNull()
  })
})

describe('slugFor', () => {
  test('tirée de la marque tant qu’on ne l’a pas touchée, sans tiret final', () => {
    expect(slugFor({ ...EMPTY_DRAFT, brand: 'Atelier Corne & Cuir ' })).toBe('atelier-corne-cuir')
    expect(
      slugFor({ ...EMPTY_DRAFT, brand: 'Atelier', slug: 'mon-atelier', slugTouched: true }),
    ).toBe('mon-atelier')
  })
})

describe('departmentOf', () => {
  test('les deux premiers chiffres ; la Corse et les outre-mer à part', () => {
    expect(departmentOf('63000')).toBe('63')
    expect(departmentOf('06390')).toBe('06')
    expect(departmentOf('20000')).toBe('2A')
    expect(departmentOf('20200')).toBe('2B')
    expect(departmentOf('97400')).toBe('974')
    expect(departmentOf('')).toBeNull()
    expect(departmentOf('6300')).toBeNull()
  })
})

describe('wallCount', () => {
  test('à la dizaine sous 1 000, à la centaine au-delà ; exact sous 10', () => {
    expect(wallCount(110)).toBe(110)
    expect(wallCount(44)).toBe(40)
    expect(wallCount(1234)).toBe(1200)
    expect(wallCount(7)).toBe(7)
  })
})

describe('initialsOf', () => {
  test('les initiales des deux premiers mots', () => {
    expect(initialsOf('Atelier Sauvage')).toBe('AS')
    expect(initialsOf('runes de chêne')).toBe('RD')
    expect(initialsOf('Bilskirnir')).toBe('B')
    expect(initialsOf('  ')).toBe('')
  })
})

describe('codeDigits', () => {
  test('les chiffres d’un code collé, six au plus', () => {
    expect(codeDigits('482 913')).toBe('482913')
    expect(codeDigits('482-913-77')).toBe('482913')
    expect(codeDigits('abc')).toBe('')
  })
})

describe('firstProblemStep', () => {
  test('la première étape encore invalide, ou null si tout est bon', () => {
    const steps = ['brand', 'firstName', 'craft', 'place', 'address'] as const
    expect(firstProblemStep([...steps], EMPTY_DRAFT)).toBe(0)
    expect(firstProblemStep([...steps], { ...EMPTY_DRAFT, brand: 'Atelier' })).toBe(1)
    expect(
      firstProblemStep([...steps], {
        ...EMPTY_DRAFT,
        brand: 'Atelier Sauvage',
        firstName: 'Uriel',
      }),
    ).toBeNull()
  })
})

describe('typedCode', () => {
  test('un chiffre tapé s’écrit dans sa case', () => {
    expect(typedCode('48', 2, '2')).toBe('482')
  })
  test('un code rempli d’un coup (iOS, clavier) remplit toutes les cases', () => {
    expect(typedCode('', 0, '482913')).toBe('482913')
    expect(typedCode('4', 1, '482 913')).toBe('482913')
  })
  test('rien de chiffré : rien ne change', () => {
    expect(typedCode('48', 2, 'a')).toBe('48')
  })
  test('un chiffre tapé dans une case pleine la remplace, sans toucher aux autres', () => {
    expect(typedCode('4829', 1, '87')).toBe('4729')
    expect(typedCode('4829', 1, '78')).toBe('4729')
    expect(typedCode('4829', 1, '88')).toBe('4829')
  })
})

describe('safeReturn', () => {
  test('seulement une adresse de l’app', () => {
    expect(safeReturn('/calendrier?mois=2026-12')).toBe('/calendrier?mois=2026-12')
    expect(safeReturn('//evil.com')).toBeNull()
    expect(safeReturn('https://evil.com')).toBeNull()
    expect(safeReturn(null)).toBeNull()
  })
})

describe('loginReturning', () => {
  it('la connexion garde l’adresse où revenir, relisible par safeReturn', () => {
    const link = loginReturning('/evenement/abc?carte')
    expect(link).toBe('/connexion?retour=%2Fevenement%2Fabc%3Fcarte')
    const back = new URLSearchParams(link.split('?')[1]).get('retour')
    expect(safeReturn(back)).toBe('/evenement/abc?carte')
  })
})
