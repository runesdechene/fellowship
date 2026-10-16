/**
 * QUOI     — tests de lib/csv-text.ts : le texte d'un fichier CSV, en UTF-8 ou en Windows-1252.
 * POURQUOI — Excel français enregistre ses CSV en Windows-1252 par défaut : les titres accentués
 *            (« Téléphone ») doivent rester lisibles.
 */
import { describe, expect, it } from 'vitest'
import { decodeCsv } from './csv-text'

describe('decodeCsv', () => {
  it('lit l’UTF-8', () => {
    expect(decodeCsv(new TextEncoder().encode('Nom;Téléphone').buffer)).toBe('Nom;Téléphone')
  })
  it('retombe sur Windows-1252 quand l’UTF-8 est invalide', () => {
    // « Téléphone » en Windows-1252 : é = 0xE9.
    const bytes = new Uint8Array([0x54, 0xe9, 0x6c, 0xe9, 0x70, 0x68, 0x6f, 0x6e, 0x65])
    expect(decodeCsv(bytes.buffer)).toBe('Téléphone')
  })
  it('retire la marque d’ordre d’octets d’Excel', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x4e, 0x6f, 0x6d])
    expect(decodeCsv(bytes.buffer)).toBe('Nom')
  })
})
