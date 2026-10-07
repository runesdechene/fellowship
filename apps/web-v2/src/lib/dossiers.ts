/**
 * QUOI     — ce que « Mes dossiers » dit d'une date à venir : où en est le dossier (envoyé ou
 *            acquis) et où en est l'argent (à payer, acompte, payé — ou, pour un cachet, à
 *            recevoir, reçu).
 * POURQUOI — la fonction plébiscitée du tableau de bord ; ses libellés se testent seuls
 *            (dossiers.test.ts).
 * ATTENTION — le montant est celui de l'emplacement (ou du cachet) saisi sur la fiche. Sans lui, on
 *            n'invente rien : « Montant à renseigner » tant qu'il reste quelque chose à régler.
 */
import { formatEuros } from './money'

export type PaymentTone = 'todo' | 'partial' | 'done'

export interface DossierInput {
  status: string
  paymentStatus: string | null
  /** `payeur` : l'exposant paie son emplacement. `paye` : il touche un cachet. */
  orientation: string
  amount: number | null
}

export interface DossierView {
  dossier: { label: string; acquired: boolean }
  payment: { label: string; detail: string | null; tone: PaymentTone }
}

const LABELS = {
  payeur: { todo: 'À payer', partial: 'Acompte versé', done: 'Payé' },
  paye: { todo: 'À recevoir', partial: 'Acompte reçu', done: 'Reçu' },
} as const

function toneOf(paymentStatus: string | null): PaymentTone {
  if (paymentStatus === 'paye') return 'done'
  if (paymentStatus === 'acompte_verse') return 'partial'
  return 'todo'
}

function detailOf(input: DossierInput, tone: PaymentTone, receives: boolean): string | null {
  const { amount } = input
  if (amount === null) return tone === 'done' ? null : 'Montant à renseigner'
  const euros = formatEuros(amount)
  if (tone === 'done') return receives ? `${euros} reçus` : `${euros} réglés`
  if (tone === 'partial') return `Reste le solde sur ${euros}`
  if (receives) return `Cachet de ${euros}`
  return input.status === 'en_cours' ? `${euros} si le dossier est accepté` : `${euros} à régler`
}

export function dossierView(input: DossierInput): DossierView {
  const acquired = input.status === 'inscrit' || input.status === 'confirme'
  const receives = input.orientation === 'paye'
  const tone = toneOf(input.paymentStatus)

  return {
    dossier: { label: acquired ? 'Inscrit' : 'Dossier envoyé', acquired },
    payment: {
      label: LABELS[receives ? 'paye' : 'payeur'][tone],
      detail: detailOf(input, tone, receives),
      tone,
    },
  }
}
