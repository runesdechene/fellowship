/**
 * QUOI     — tests de lib/cipher.ts : phrase de passe, clé, scellement des recettes.
 * POURQUOI — le chiffrement est la seule garantie que la base ne lit pas les recettes : l'aller-retour,
 *            la longueur constante et le refus d'une mauvaise phrase se vérifient avec les vrais
 *            paramètres (600 000 itérations), pas avec une version allégée.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createKey,
  isStrongPassphrase,
  keyMatches,
  openRevenue,
  resealAll,
  whichKeyOpens,
  sealRevenue,
  unlockKey,
  type KeyRecord,
} from './cipher'

const PHRASE = 'chêne lune forge rivière'

describe('cipher', () => {
  let key: CryptoKey
  let record: KeyRecord

  beforeAll(async () => {
    ;({ key, record } = await createKey(PHRASE))
  })

  it('juge la force de la phrase de passe', () => {
    expect(isStrongPassphrase(PHRASE)).toBe(true)
    expect(isStrongPassphrase('lune2festival-rdc')).toBe(true)
    expect(isStrongPassphrase('runesdechene2026')).toBe(true) // 16 tout juste
    expect(isStrongPassphrase('runesdechene202')).toBe(false) // 15
    // Les espaces autour ne comptent pas.
    expect(isStrongPassphrase('   runesdechene202  ')).toBe(false)
  })

  it('rend les montants tels qu’ils ont été scellés', async () => {
    const full = { carte: 2830, especes: 1380 }
    const cents = { carte: 0, especes: 0.5 }
    expect(await openRevenue(key, await sealRevenue(key, full))).toEqual(full)
    expect(await openRevenue(key, await sealRevenue(key, cents))).toEqual(cents)
  })

  it('donne deux messages différents pour le même montant', async () => {
    const revenue = { carte: 100, especes: 50 }
    expect(await sealRevenue(key, revenue)).not.toBe(await sealRevenue(key, revenue))
  })

  it('ne trahit pas le montant par la longueur du message', async () => {
    const zero = await sealRevenue(key, { carte: 0, especes: 0 })
    const big = await sealRevenue(key, { carte: 999999.99, especes: 999999.99 })
    expect(zero.length).toBe(big.length)
  })

  it('refuse une mauvaise phrase et rouvre avec la bonne', async () => {
    expect(await unlockKey('mauvaise phrase de passe ici', record)).toBeNull()
    const again = await unlockKey(PHRASE, record)
    expect(again).not.toBeNull()
    if (!again) return
    const revenue = { carte: 412, especes: 138 }
    expect(await openRevenue(again, await sealRevenue(key, revenue))).toEqual(revenue)
  })

  it('reconnaît sa clé et refuse celle d’une phrase recréée', async () => {
    expect(await keyMatches(key, record)).toBe(true)
    const other = await createKey(PHRASE)
    expect(await keyMatches(key, other.record)).toBe(false)
    expect(await keyMatches(key, { check: 'pas du base64 chiffré' })).toBe(false)
  })

  it('refuse un montant hors plage et accepte le maximum', async () => {
    for (const bad of [-1, NaN, Infinity, 1_000_000]) {
      await expect(sealRevenue(key, { carte: bad, especes: 0 })).rejects.toThrow()
      await expect(sealRevenue(key, { carte: 0, especes: bad })).rejects.toThrow()
    }
    const max = { carte: 999999.99, especes: 999999.99 }
    expect(await openRevenue(key, await sealRevenue(key, max))).toEqual(max)
  })

  it('rouvre avec la phrase en NFD ou avec une espace en fin', async () => {
    const revenue = { carte: 10, especes: 5 }
    const payload = await sealRevenue(key, revenue)
    for (const typed of [PHRASE.normalize('NFD'), `${PHRASE} `]) {
      const unlocked = await unlockKey(typed, record)
      expect(unlocked).not.toBeNull()
      if (!unlocked) return
      expect(await openRevenue(unlocked, payload)).toEqual(revenue)
    }
    expect(isStrongPassphrase(PHRASE.normalize('NFD'))).toBe(true)
  })

  it('pose un sel de 16 octets et 600 000 itérations', () => {
    expect(record.iterations).toBe(600000)
    expect(atob(record.salt).length).toBe(16)
  })

  it('rescelle toutes les recettes sous la nouvelle phrase, et rien sous l’ancienne', async () => {
    const amounts = [
      { carte: 2830, especes: 1380 },
      { carte: 0, especes: 0.5 },
    ]
    const rows = await Promise.all(
      amounts.map(async (revenue, index) => ({
        event_id: `date-${String(index)}`,
        payload: await sealRevenue(key, revenue),
      })),
    )
    const next = await createKey('une toute nouvelle phrase de passe')
    const resealed = await resealAll(key, rows, next.key)
    expect(resealed.map((row) => row.event_id)).toEqual(['date-0', 'date-1'])
    for (const [index, row] of resealed.entries()) {
      expect(await openRevenue(next.key, row.payload)).toEqual(amounts[index])
      await expect(openRevenue(key, row.payload)).rejects.toThrow()
    }
    expect(await resealAll(key, [], next.key)).toEqual([])
  })

  it('dit si la phrase en place est la nouvelle, l’ancienne, ou ni l’une ni l’autre', async () => {
    const next = await createKey('une toute nouvelle phrase de passe')
    const other = await createKey('la phrase d’un autre appareil')
    expect(await whichKeyOpens(next.record, key, next.key)).toBe('new')
    expect(await whichKeyOpens(record, key, next.key)).toBe('old')
    expect(await whichKeyOpens(other.record, key, next.key)).toBeNull()
    expect(await whichKeyOpens(null, key, next.key)).toBeNull()
  })

  it('refuse de rechiffrer si une recette ne s’ouvre pas avec l’ancienne clé', async () => {
    const stranger = await createKey('la phrase d’une autre enseigne')
    const rows = [
      { event_id: 'a', payload: await sealRevenue(key, { carte: 1, especes: 2 }) },
      { event_id: 'b', payload: await sealRevenue(stranger.key, { carte: 3, especes: 4 }) },
    ]
    await expect(resealAll(key, rows, stranger.key)).rejects.toThrow()
  })
})
