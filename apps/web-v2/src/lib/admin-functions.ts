/**
 * QUOI     — les appels de l'administration aux fonctions serveur (admin-stripe) et la forme de
 *            leurs réponses.
 * POURQUOI — un seul endroit qui connaît leurs noms et leurs corps ; les écrans n'appellent que ça.
 */
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

async function call<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await supabase.functions.invoke<T>(name, { body })
  const failure: unknown = response.error
  if (failure || response.data === null) {
    throw new Error(failure instanceof Error ? failure.message : 'La fonction n’a rien rendu')
  }
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
