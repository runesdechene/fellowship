/**
 * QUOI     — la ligne « Code de cet appareil » sous les recettes chiffrées d'une enseigne : l'appareil
 *            garde-t-il la clé derrière un code, et « Oublier sur cet appareil ».
 * POURQUOI — sans elle, on ne changerait de code qu'en se trompant 5 fois (Uriel, 01/11/2026). Un
 *            code oublié se rechoisit à la prochaine ouverture par la phrase (PinOffer).
 */
import { KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { forgetDeviceKey, hasDeviceKey } from '@/lib/device-key'
import { SettingRow } from './SettingRow'

export function DevicePinRow({ entityId }: { entityId: string }) {
  // null tant que l'appareil n'a pas répondu.
  const [has, setHas] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    hasDeviceKey(entityId).then(
      (value) => {
        if (!cancelled) setHas(value)
      },
      () => {
        if (!cancelled) setHas(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [entityId])

  if (has === null) return null
  return (
    <SettingRow
      className="setting-row--sub"
      leading={<KeyRound className="setting-row__icon" size={15} strokeWidth={2} />}
      title="Code de cet appareil"
      note={
        has
          ? 'Tes recettes se rouvrent ici avec 4 chiffres. Ce code ne vaut que pour cet appareil.'
          : 'Ouvre tes recettes avec ta phrase dans un bilan : un code propre à cet appareil te sera proposé.'
      }
    >
      {has && (
        <button
          type="button"
          className="delete-account__open"
          onClick={() => {
            void forgetDeviceKey(entityId).then(() => {
              setHas(false)
            })
          }}
        >
          Oublier sur cet appareil
        </button>
      )}
    </SettingRow>
  )
}
