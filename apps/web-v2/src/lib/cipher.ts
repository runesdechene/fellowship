/**
 * QUOI     — le chiffrement des recettes (Carte, Espèces) d'une enseigne : phrase de passe → clé,
 *            scellement et ouverture d'un montant. Web Crypto seul, aucune dépendance.
 * POURQUOI — la base ne doit jamais pouvoir lire ces chiffres : tout se chiffre ici, dans le
 *            navigateur, avec une clé dérivée d'une phrase que le serveur ne voit pas.
 * ATTENTION — oubliée, la phrase ne se récupère pas. Les montants sont écrits en centimes sur
 *            12 chiffres pour que la longueur du message ne trahisse pas leur ordre de grandeur.
 *            La phrase est normalisée (`trim().normalize('NFC')`) avant toute dérivation : un accent
 *            tapé en NFD sur un autre appareil donnerait sinon une autre clé. Le plugin Obsidian
 *            doit faire exactement la même chose.
 */

export interface KeyRecord {
  salt: string
  iterations: number
  check: string
}

/** Montants en euros. */
export interface SecretRevenue {
  carte: number
  especes: number
}

const ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12
const CHECK_WORD = 'fellowship'

const normalize = (phrase: string) => phrase.trim().normalize('NFC')

/** Assez longue pour résister à des essais hors ligne : 16 caractères (Uriel, 31/10/2026). */
export const MIN_PASSPHRASE_LENGTH = 16

export function isStrongPassphrase(phrase: string): boolean {
  return normalize(phrase).length >= MIN_PASSPHRASE_LENGTH
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0))
}

async function deriveKey(phrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalize(phrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** base64(IV ‖ chiffré) : un IV neuf à chaque scellement, sinon AES-GCM perd sa sécurité. */
async function seal(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const body = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text),
  )
  const payload = new Uint8Array(IV_BYTES + body.byteLength)
  payload.set(iv)
  payload.set(new Uint8Array(body), IV_BYTES)
  return toBase64(payload)
}

/** Rend le clair, ou lève si la clé n'est pas la bonne (AES-GCM authentifie le message). */
async function open(key: CryptoKey, payload: string): Promise<string> {
  const bytes = fromBase64(payload)
  const body = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, IV_BYTES) },
    key,
    bytes.slice(IV_BYTES),
  )
  return new TextDecoder().decode(body)
}

export async function createKey(phrase: string): Promise<{ key: CryptoKey; record: KeyRecord }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await deriveKey(phrase, salt, ITERATIONS)
  return {
    key,
    record: { salt: toBase64(salt), iterations: ITERATIONS, check: await seal(key, CHECK_WORD) },
  }
}

/** Vrai si `key` ouvre ce `check` : une phrase changée ailleurs donne une clé qui ne l'ouvre plus. */
export async function keyMatches(
  key: CryptoKey,
  record: Pick<KeyRecord, 'check'>,
): Promise<boolean> {
  try {
    return (await open(key, record.check)) === CHECK_WORD
  } catch {
    return false
  }
}

/** La clé si la phrase est la bonne, sinon null. */
export async function unlockKey(phrase: string, record: KeyRecord): Promise<CryptoKey | null> {
  const key = await deriveKey(phrase, fromBase64(record.salt), record.iterations)
  return (await keyMatches(key, record)) ? key : null
}

const toCents = (euros: number) => String(Math.round(euros * 100)).padStart(12, '0')
const toEuros = (cents: string) => Number(cents) / 100

const MAX_AMOUNT = 999_999.99

export async function sealRevenue(key: CryptoKey, revenue: SecretRevenue): Promise<string> {
  // Hors de cette plage, les 12 chiffres ne tiennent plus (signe, NaN, 13 chiffres).
  for (const amount of [revenue.carte, revenue.especes]) {
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) {
      throw new Error(`Montant impossible à chiffrer : ${amount}`)
    }
  }
  return seal(
    key,
    JSON.stringify({ carte: toCents(revenue.carte), especes: toCents(revenue.especes) }),
  )
}

export async function openRevenue(key: CryptoKey, payload: string): Promise<SecretRevenue> {
  const { carte, especes } = JSON.parse(await open(key, payload)) as Record<string, string>
  return { carte: toEuros(String(carte)), especes: toEuros(String(especes)) }
}

/**
 * Après un changement de phrase dont la réponse s'est perdue : 'new' si la nouvelle clé ouvre la
 * phrase en place (le changement a eu lieu), 'old' si c'est l'ancienne (rien n'a bougé), null si
 * aucune, ou si la phrase n'a pas pu être relue.
 */
export async function whichKeyOpens(
  record: Pick<KeyRecord, 'check'> | null,
  oldKey: CryptoKey,
  newKey: CryptoKey,
): Promise<'new' | 'old' | null> {
  if (!record) return null
  if (await keyMatches(newKey, record)) return 'new'
  if (await keyMatches(oldKey, record)) return 'old'
  return null
}

/**
 * Les recettes d'une enseigne, ouvertes avec l'ancienne clé et rescellées avec la nouvelle (« Changer
 * la phrase »). Lève si une seule ne s'ouvre pas : on ne rechiffre jamais une partie seulement.
 */
export async function resealAll(
  oldKey: CryptoKey,
  rows: readonly { event_id: string; payload: string }[],
  newKey: CryptoKey,
): Promise<{ event_id: string; payload: string }[]> {
  return Promise.all(
    rows.map(async (row) => ({
      event_id: row.event_id,
      payload: await sealRevenue(newKey, await openRevenue(oldKey, row.payload)),
    })),
  )
}
