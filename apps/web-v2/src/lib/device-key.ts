/**
 * QUOI     — la clé des recettes gardée sur l'appareil, derrière un code de 4 chiffres : la ranger,
 *            savoir si l'appareil l'a, la rouvrir avec le code, l'oublier, la remplacer.
 * POURQUOI — retaper une phrase de 16 caractères toutes les 15 minutes dégoûterait sur téléphone
 *            (Uriel, 01/11/2026). La phrase se tape une fois par appareil ; ensuite le code suffit.
 * ATTENTION — le code ne protège que l'appareil, jamais la base : 4 chiffres se devinent en
 *            secondes hors ligne. La clé est rangée telle quelle (non exportable) dans IndexedDB ;
 *            le code est vérifié comme une phrase (lib/cipher.ts). 5 codes faux et l'appareil
 *            oublie la clé : il faut retaper la phrase.
 */
import { createKey, unlockKey, type KeyRecord } from './cipher'

export const PIN_LENGTH = 4
export const MAX_PIN_TRIES = 5

interface DeviceKey {
  key: CryptoKey
  pin: KeyRecord
  /** Codes faux d'affilée. */
  tries: number
}

export type PinOutcome =
  | { kind: 'ok'; key: CryptoKey }
  | { kind: 'wrong'; left: number }
  /** 5 codes faux, ou plus rien sur l'appareil : retour à la phrase. */
  | { kind: 'forgotten' }

export function isPin(code: string): boolean {
  return new RegExp(`^\\d{${String(PIN_LENGTH)}}$`).test(code)
}

/** Après un code faux : les essais qui restent, 0 quand l'appareil doit oublier la clé. */
export function triesLeft(wrongInARow: number): number {
  return Math.max(0, MAX_PIN_TRIES - wrongInARow)
}

const DB_NAME = 'fellowship'
const STORE = 'device-keys'

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB indisponible'))
    }
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB indisponible'))
    }
  })
}

async function read(actorId: string): Promise<DeviceKey | undefined> {
  // IndexedDB rend `any` : la seule écriture de ce magasin est `write`, qui range un DeviceKey.
  return run('readonly', (store) => store.get(actorId) as IDBRequest<DeviceKey | undefined>)
}

async function write(actorId: string, entry: DeviceKey): Promise<void> {
  await run('readwrite', (store) => store.put(entry, actorId))
}

export async function hasDeviceKey(actorId: string): Promise<boolean> {
  return (await read(actorId)) !== undefined
}

export async function storeDeviceKey(actorId: string, key: CryptoKey, pin: string): Promise<void> {
  const { record } = await createKey(pin)
  await write(actorId, { key, pin: record, tries: 0 })
}

export async function forgetDeviceKey(actorId: string): Promise<void> {
  await run('readwrite', (store) => store.delete(actorId))
}

/** La phrase a changé ici : la nouvelle clé prend la place de l'ancienne, le code reste le même. */
export async function replaceDeviceKey(actorId: string, key: CryptoKey): Promise<void> {
  const entry = await read(actorId)
  if (entry) await write(actorId, { ...entry, key })
}

export async function openDeviceKey(actorId: string, pin: string): Promise<PinOutcome> {
  const entry = await read(actorId)
  if (!entry) return { kind: 'forgotten' }
  if (await unlockKey(pin, entry.pin)) {
    if (entry.tries > 0) await write(actorId, { ...entry, tries: 0 })
    return { kind: 'ok', key: entry.key }
  }
  const left = triesLeft(entry.tries + 1)
  if (left === 0) {
    await forgetDeviceKey(actorId)
    return { kind: 'forgotten' }
  }
  await write(actorId, { ...entry, tries: entry.tries + 1 })
  return { kind: 'wrong', left }
}
