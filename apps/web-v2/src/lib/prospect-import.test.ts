/**
 * QUOI     — tests de lib/prospect-import.ts : un CSV de tableur devient une liste de prospects.
 * POURQUOI — les fichiers viennent d'Excel ou de Google Sheets, avec des titres écrits à la main.
 */
import { describe, expect, it } from 'vitest'
import { emailsOf, planImport } from './prospect-import'

const HEADER = ['Nom', 'Marque', 'Activité', 'Ville', 'E-mail', 'Téléphone', 'Commentaire']

describe('planImport', () => {
  it('reconnaît les titres sans accents ni casse', () => {
    const plan = planImport(
      [
        HEADER,
        [
          'Manon Leclerc',
          'Cuir de Lune',
          'Maroquinerie',
          'Nantes',
          'Manon@CuirDeLune.fr',
          '06 41 22 18 90',
          'Veut tester',
        ],
      ],
      new Set(),
      '',
    )
    expect(plan.toAdd).toEqual([
      {
        name: 'Manon Leclerc',
        brand: 'Cuir de Lune',
        activity: 'Maroquinerie',
        city: 'Nantes',
        email: 'manon@cuirdelune.fr',
        phone: '06 41 22 18 90',
        source: null,
        note: 'Veut tester',
      },
    ])
  })
  it('accepte les synonymes : courriel, tel, enseigne, prénom', () => {
    const plan = planImport(
      [
        ['Prénom', 'Enseigne', 'Courriel', 'Tel'],
        ['Arthur', 'Forge & Feu', 'contact@forgeetfeu.fr', '07 82 10 44 31'],
      ],
      new Set(),
      '',
    )
    expect(plan.toAdd[0]).toMatchObject({
      name: 'Arthur',
      brand: 'Forge & Feu',
      email: 'contact@forgeetfeu.fr',
      phone: '07 82 10 44 31',
    })
  })
  it('prénom et nom se joignent dans l’ordre des colonnes', () => {
    const plan = planImport(
      [
        ['Prénom', 'Nom'],
        ['Élise', 'Caron'],
      ],
      new Set(),
      '',
    )
    expect(plan.toAdd[0]?.name).toBe('Élise Caron')
  })
  it('compte en doublon un e-mail déjà connu ou répété dans le fichier', () => {
    const plan = planImport(
      [
        ['Nom', 'E-mail'],
        ['A', 'a@x.fr'],
        ['B', 'B@X.FR'],
        ['C', 'b@x.fr'],
      ],
      new Set(['a@x.fr']),
      '',
    )
    expect(plan.toAdd.map((p) => p.name)).toEqual(['B'])
    expect(plan.duplicates).toBe(2)
  })
  it('ignore une ligne sans nom, marque ni e-mail', () => {
    const plan = planImport(
      [
        ['Nom', 'Ville'],
        ['', 'Lyon'],
        ['Hugo', 'Dijon'],
      ],
      new Set(),
      '',
    )
    expect(plan.toAdd).toHaveLength(1)
    expect(plan.ignored).toBe(1)
  })
  it('la source commune remplit les lignes qui n’en ont pas', () => {
    const plan = planImport(
      [
        ['Nom', 'Source'],
        ['A', 'Instagram'],
        ['B', ''],
      ],
      new Set(),
      'Salon de Rennes',
    )
    expect(plan.toAdd.map((p) => p.source)).toEqual(['Instagram', 'Salon de Rennes'])
  })
  it('un fichier vide ou sans titre reconnu ne donne rien', () => {
    expect(planImport([], new Set(), '').toAdd).toEqual([])
    expect(planImport([['Colonne inconnue'], ['x']], new Set(), '').toAdd).toEqual([])
  })
})

describe('emailsOf', () => {
  it('les e-mails du fichier, rangés, sans vides', () => {
    expect(
      emailsOf([
        ['Nom', 'Mail'],
        ['A', ' A@X.fr '],
        ['B', ''],
      ]),
    ).toEqual(['a@x.fr'])
  })
})
