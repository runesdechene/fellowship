/**
 * QUOI     — le panneau « Poser une remise » sous les boutons de l'Abonnement : les coupons qui
 *            existent chez Stripe, un choix, « Appliquer ».
 * POURQUOI — la remise se pose sur l'abonnement Stripe (admin-stripe) ; c'est le webhook qui la
 *            recopie ensuite dans la fiche, d'où le message d'attente puis `onApplied` après 3 s.
 *            Créer un coupon se fait dans Stripe : un lien y mène.
 */
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import { applyCoupon, fetchCoupons, type Coupon } from '@/lib/admin-functions'
import { formatPrice } from '@/lib/money'

const REFRESH_DELAY_MS = 3000

function couponLabel(coupon: Coupon): string {
  const amount =
    coupon.percentOff !== null ? `${coupon.percentOff} %` : formatPrice(coupon.amountOff ?? 0)
  const duration =
    coupon.duration === 'once'
      ? 'une fois'
      : coupon.duration === 'forever'
        ? 'pour toujours'
        : `${coupon.months ?? 0} mois`
  return `${coupon.name} — ${amount}, ${duration}`
}

interface Props {
  entityId: string
  onClose: () => void
  onApplied: () => void
}

export function DiscountPicker({ entityId, onClose, onApplied }: Props) {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCoupons()
      .then((list) => {
        if (!cancelled) setCoupons(list)
      })
      .catch((failure: unknown) => {
        if (!cancelled)
          setError(failure instanceof Error ? failure.message : 'Stripe ne répond pas')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = choice ?? coupons?.[0]?.id ?? null
  const options: SelectOption<string>[] = (coupons ?? []).map((coupon) => ({
    value: coupon.id,
    label: couponLabel(coupon),
  }))

  async function apply() {
    if (sending || !selected) return
    setSending(true)
    setError(null)
    try {
      await applyCoupon(entityId, selected)
      setDone(true)
      window.setTimeout(onApplied, REFRESH_DELAY_MS)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Remise impossible')
      setSending(false)
    }
  }

  return (
    <div className="gift">
      {done ? (
        <p className="gift__end" role="status">
          Remise posée : elle apparaît ici dès que Stripe a prévenu Fellowship (quelques secondes).
        </p>
      ) : (
        <div className="gift__line">
          {coupons && options.length === 0 && (
            <span className="gift__end">Aucun coupon chez Stripe.</span>
          )}
          {selected && (
            <>
              <span className="gift__word">Remise</span>
              <Select label="Coupon" value={selected} options={options} onChange={setChoice} />
              <Button onClick={() => void apply()} disabled={sending}>
                Appliquer
              </Button>
            </>
          )}
          <Button variant="bare" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <a
            className="sheet-link"
            href="https://dashboard.stripe.com/coupons/create"
            target="_blank"
            rel="noreferrer"
          >
            Créer un coupon dans Stripe ↗
          </a>
        </div>
      )}
      {error && (
        <p className="sheet-form__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
