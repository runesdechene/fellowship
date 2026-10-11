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
  safeReturn,
  typedCode,
  departmentOf,
  EMPTY_DRAFT,
  initialsOf,
  slugFor,
  stepProblem,
  wallCount,
  welcomeSteps,
} from './welcome'

describe('welcomeSteps', () => {
  test('un nouveau compte : la marque, puis le prénom, le métier, la ville, l’adresse', () => {
    expect(welcomeSteps('new')).toEqual(['brand', 'firstName', 'craft', 'place', 'address'])
  })
  test('une enseigne existe déjà : le prénom seul', () => {
    expect(welcomeSteps('nameOnly')).toEqual(['firstName'])
  })
  test('créer un compte exposant : tout sauf le prénom', () => {
    expect(welcomeSteps('newEntity')).toEqual(['brand', 'craft', 'place', 'address'])
  })
})

describe('stepProblem', () => {
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
})

describe('safeReturn', () => {
  test('seulement une adresse de l’app', () => {
    expect(safeReturn('/calendrier?mois=2026-12')).toBe('/calendrier?mois=2026-12')
    expect(safeReturn('//evil.com')).toBeNull()
    expect(safeReturn('https://evil.com')).toBeNull()
    expect(safeReturn(null)).toBeNull()
  })
})
