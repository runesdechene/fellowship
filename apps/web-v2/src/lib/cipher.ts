/**
 * QUOI     — le chiffrement des recettes (Carte, Espèces) d'une enseigne : phrase de passe → clé,
 *            scellement et ouverture d'un montant. Web Crypto seul, aucune dépendance.
 * POURQUOI — la base ne doit jamais pouvoir lire ces chiffres : tout se chiffre ici, dans le
 *            navigateur, avec une clé dérivée d'une phrase que le serveur ne voit pas.
 * ATTENTION — oubliée, la phrase ne se récupère pas. Les montants sont écrits en centimes sur
 *            12 chiffres pour que la longueur du message ne trahisse pas leur ordre de grandeur.
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

export function isStrongPassphrase(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/)
  return words.length >= 4 && phrase.trim().length >= 20
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
    new TextEncoder().encode(phrase),
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

/** La clé si la phrase est la bonne, sinon null. */
export async function unlockKey(phrase: string, record: KeyRecord): Promise<CryptoKey | null> {
  const key = await deriveKey(phrase, fromBase64(record.salt), record.iterations)
  try {
    return (await open(key, record.check)) === CHECK_WORD ? key : null
  } catch {
    return null
  }
}

const toCents = (euros: number) => String(Math.round(euros * 100)).padStart(12, '0')
const toEuros = (cents: string) => Number(cents) / 100

export function sealRevenue(key: CryptoKey, revenue: SecretRevenue): Promise<string> {
  return seal(
    key,
    JSON.stringify({ carte: toCents(revenue.carte), especes: toCents(revenue.especes) }),
  )
}

export async function openRevenue(key: CryptoKey, payload: string): Promise<SecretRevenue> {
  const { carte, especes } = JSON.parse(await open(key, payload)) as Record<string, string>
  return { carte: toEuros(String(carte)), especes: toEuros(String(especes)) }
}
