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
  // Tapée puis abandonnée sans choisir de suggestion : on le dit, plutôt que de l'effacer en silence.
  const [dropped, setDropped] = useState(false)

  return (
    <SettingRow
      title="Siège social ou atelier"
      note={
        base.error ??
        (dropped
          ? 'Choisis une adresse dans la liste pour l’enregistrer.'
          : 'Sert au calcul des distances. N’est jamais affiché.')
      }
    >
      <span
        className="entity-base"
        onBlur={() => {
          if (typed !== null && typed.trim() === '' && base.address) void base.clear()
          setDropped(typed !== null && typed.trim() !== '' && typed !== base.address)
          setTyped(null)
        }}
      >
        <AddressField
          value={typed ?? base.address ?? (base.loaded ? '' : '…')}
          onType={setTyped}
          placeholder="12 rue des Gras, Clermont-Ferrand"
          onPick={(place) => {
            // Le libellé choisi reste affiché le temps de l'enregistrement : sans ça, l'ancienne
            // adresse revenait une fraction de seconde.
            setTyped(place.label)
            setDropped(false)
            void base.pick(place).then(() => {
              setTyped(null)
            })
          }}
        />
      </span>
    </SettingRow>
  )
}
