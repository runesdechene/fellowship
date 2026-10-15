/**
 * QUOI     — les appels de l'administration aux fonctions serveur (admin-stripe, admin-compte, delete-account) et la forme de
 *            leurs réponses.
 * POURQUOI — un seul endroit qui connaît leurs noms et leurs corps ; les écrans n'appellent que ça. Un refus connu du serveur (soi-même,
 *            adresse prise…) remonte en phrase française.
 */
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface Invoice {
  id: string
  date: string
  amountCents: number
  label: string
  status: string | null
  url: string | null
}
export interface Payments {
  customerEmail: string | null
  invoices: Invoice[]
}
export interface Coupon {
  id: string
  name: string
  percentOff: number | null
  amountOff: number | null
  duration: string
  months: number | null
}

export interface DeletionPreview {
  deleted: { entityActorId: string; brandName: string; subscribed: boolean }[]
  kept: { entityActorId: string; brandName: string; endsOn: string | null }[]
}

const KNOWN_ERRORS: Record<string, string> = {
  self: 'Ce n’est pas possible sur ton propre compte.',
  email_taken: 'Cette adresse est déjà utilisée par un autre compte.',
  invalid_email: 'Cette adresse n’est pas valable.',
  forbidden: 'Tu n’as pas le droit de faire ça.',
}

/** La phrase d'un refus connu du serveur, lue dans le corps JSON de sa réponse. */
async function refusal(failure: unknown): Promise<string> {
  if (failure instanceof FunctionsHttpError && failure.context instanceof Response) {
    const body: unknown = await failure.context.json().catch(() => null)
    const code = typeof body === 'object' && body !== null && 'error' in body ? body.error : null
    const known = typeof code === 'string' ? KNOWN_ERRORS[code] : undefined
    if (known) return known
  }
  return failure instanceof Error ? failure.message : 'La fonction n’a rien rendu'
}

async function call<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await supabase.functions.invoke<T>(name, { body })
  const failure: unknown = response.error
  if (failure || response.data === null) throw new Error(await refusal(failure))
  return response.data
}

export const fetchPayments = (entityId: string) =>
  call<Payments>('admin-stripe', { action: 'paiements', entityId })
export const fetchCoupons = () =>
  call<{ coupons: Coupon[] }>('admin-stripe', { action: 'coupons' }).then((r) => r.coupons)
export const applyCoupon = (entityId: string, couponId: string) =>
  call<{ done: true }>('admin-stripe', { action: 'remise', entityId, couponId }).then(
    () => undefined,
  )

export const suspendAccount = (userId: string) =>
  call<{ done: true }>('admin-compte', { action: 'suspendre', userId }).then(() => undefined)
export const reactivateAccount = (userId: string) =>
  call<{ done: true }>('admin-compte', { action: 'reactiver', userId }).then(() => undefined)
export const changeEmail = (userId: string, email: string) =>
  call<{ done: true }>('admin-compte', { action: 'email', userId, email }).then(() => undefined)
export const previewDeletion = (userId: string) =>
  call<DeletionPreview>('delete-account', { confirm: false, userId })
export const deleteAccount = (userId: string) =>
  call<{ done: true }>('delete-account', { confirm: true, userId }).then(() => undefined)
