/**
 * QUOI     — la ligne « Siège social ou atelier » sous une enseigne des Réglages : une adresse choisie
 *            parmi les suggestions, enregistrée aussitôt ; vider le champ l'efface.
 * POURQUOI — maquette 2263:425 (lot 13) : « à 142 km de ton atelier » sur la fiche. Le siège sert au
 *            calcul des distances et n'est jamais affiché ; l'emplacement public reste sur la vitrine.
 */
import { useState } from 'react'
import { AddressField } from '@/features/event-create/AddressField'
import { SettingRow } from './SettingRow'
import { useEntityBase } from './useEntityBase'

export function EntityBase({ entityId }: { entityId: string }) {
  const base = useEntityBase(entityId)
  // Ce qui est tapé ; `null` tant qu'on n'a pas touché au champ (il montre l'adresse enregistrée).
  const [typed, setTyped] = useState<string | null>(null)
  if (!base.loaded) return null

  return (
    <SettingRow
      title="Siège social ou atelier"
      note={base.error ?? 'Sert au calcul des distances. N’est jamais affiché.'}
    >
      <span
        className="entity-base"
        onBlur={() => {
          if (typed !== null && typed.trim() === '' && base.address) void base.clear()
          setTyped(null)
        }}
      >
        <AddressField
          value={typed ?? base.address ?? ''}
          onType={setTyped}
          onPick={(place) => {
            setTyped(null)
            void base.pick(place)
          }}
        />
      </span>
    </SettingRow>
  )
}
