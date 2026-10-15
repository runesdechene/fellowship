/**
 * QUOI     — le petit panneau « Offrir des mois » sous les boutons de l'Abonnement : un nombre de mois
 *            (1 à 12), la date de fin que cela donne, et « Offrir ».
 * POURQUOI — écrit par `admin_offrir_mois` (gardée admin) ; l'aperçu vient de `giftEnd`, qui suit la
 *            règle de la base. L'erreur reste affichée, et un envoi en cours bloque le second.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import { formatFullDate, giftEnd } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { EntityFields } from './useAdminEntity'

const MONTH_OPTIONS: SelectOption<number>[] = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1} mois`,
}))

interface Props {
  entity: EntityFields
  onClose: () => void
  onGifted: () => void
}

export function GiftMonths({ entity, onClose, onGifted }: Props) {
  const [months, setMonths] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const end = giftEnd(entity.comped_pro_until, months, new Date())

  async function gift() {
    if (sending) return
    setSending(true)
    setError(null)
    const { error: failure } = await supabase.rpc('admin_offrir_mois', {
      p_entity: entity.actor_id,
      p_mois: months,
    })
    setSending(false)
    if (failure) setError(failure.message)
    else onGifted()
  }

  return (
    <div className="gift">
      <div className="gift__line">
        <span className="gift__word">Offrir</span>
        <Select
          label="Nombre de mois"
          value={months}
          options={MONTH_OPTIONS}
          onChange={setMonths}
        />
        <span className="gift__end">jusqu’au {formatFullDate(end)}</span>
        <Button onClick={() => void gift()} disabled={sending}>
          Offrir
        </Button>
        <Button variant="bare" onClick={onClose} disabled={sending}>
          Annuler
        </Button>
      </div>
      {error && (
        <p className="sheet-form__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
