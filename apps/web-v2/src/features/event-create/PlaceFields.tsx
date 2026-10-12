/**
 * QUOI     — les champs « Où et quand » : l'adresse suggérée, la ville, le département, les dates.
 * POURQUOI — la création (10b) et la modification (10c) posent les mêmes questions : un seul
 *            composant, pour qu'une règle (la position effacée quand le lieu change) vaille partout.
 */
import { Field, Input } from '@/components/ui/Field'
import { AddressField } from './AddressField'
import {
  addressTyped,
  placePicked,
  placeTyped,
  type EventDraft,
  type UpdateFn,
} from './useEventDraft'

interface PlaceFieldsProps {
  draft: EventDraft
  update: UpdateFn
  patch: (fields: Partial<EventDraft>) => void
}

export function PlaceFields({ draft, update, patch }: PlaceFieldsProps) {
  return (
    <>
      <Field label="Adresse ou lieu">
        <AddressField
          value={draft.address}
          onType={(address) => patch(addressTyped(address))}
          onPick={(place) => patch(placePicked(place))}
        />
      </Field>

      <div className="fields__row">
        <Field label="Ville" required>
          <Input
            value={draft.city}
            onChange={(event) => patch(placeTyped('city', event.target.value))}
            placeholder="Provins"
          />
        </Field>
        <Field label="Département" required>
          <Input
            value={draft.department}
            onChange={(event) => patch(placeTyped('department', event.target.value))}
            placeholder="77"
          />
        </Field>
      </div>

      <div className="fields__row">
        <Field label="Début" required>
          <Input
            type="date"
            value={draft.startDate}
            onChange={(event) => update('startDate', event.target.value)}
          />
        </Field>
        <Field label="Fin">
          <Input
            type="date"
            value={draft.endDate}
            onChange={(event) => update('endDate', event.target.value)}
          />
        </Field>
      </div>
    </>
  )
}
