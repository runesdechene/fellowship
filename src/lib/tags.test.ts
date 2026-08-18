import { describe, expect, it } from 'vitest'
import { tagStyleFor, tagStylesByName, type TagRow } from './tags'

const ROWS: TagRow[] = [
  {
    name: 'Marché de Noël',
    slug: 'marche-de-noel',
    bgColor: '#f6e7dc',
    textColor: '#c0642a',
  },
  { name: 'Médiéval', slug: 'medieval', bgColor: '#e8f0d8', textColor: '#84aa3c' },
]

describe('résolution des tags', () => {
  it('retrouve un tag écrit sous son nom — ce que la V2 enregistre', () => {
    const styles = tagStylesByName(ROWS)
    expect(tagStyleFor(styles, 'Marché de Noël')?.bgColor).toBe('#f6e7dc')
  })

  // Le bug qui laissait tout en gris : les événements de la V1 portent le
  // slug, pas le nom.
  it('retrouve un tag écrit sous son slug — ce que la V1 enregistrait', () => {
    const styles = tagStylesByName(ROWS)
    expect(tagStyleFor(styles, 'marche-de-noel')?.bgColor).toBe('#f6e7dc')
  })

  it('ignore la casse', () => {
    const styles = tagStylesByName(ROWS)
    expect(tagStyleFor(styles, 'MÉDIÉVAL')?.textColor).toBe('#84aa3c')
  })

  // Un slug n'est pas lisible : la fiche doit afficher le vrai nom.
  it('rend le libellé propre même quand on l’a trouvé par son slug', () => {
    const styles = tagStylesByName(ROWS)
    expect(tagStyleFor(styles, 'marche-de-noel')?.label).toBe('Marché de Noël')
  })

  it('ne trouve rien pour un tag retiré de l’administration', () => {
    const styles = tagStylesByName(ROWS)
    expect(tagStyleFor(styles, 'brocante')).toBeUndefined()
  })
})
