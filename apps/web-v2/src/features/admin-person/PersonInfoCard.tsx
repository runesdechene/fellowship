/**
 * QUOI     — le bloc Informations : prénom, e-mail, téléphone, identifiant, code postal,
 *            notifications, mode de connexion ; « Corriger » (ou « Modifier » de l'en-tête) le
 *            passe en formulaire.
 * POURQUOI — l'état « en correction » vit dans la page, pour que les deux boutons l'ouvrent.
 */
import { Info } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { SheetRow } from '@/components/ui/SheetRow'
import { PersonEditForm } from './PersonEditForm'
import type { PersonFields } from './useAdminPerson'

const NONE = '—'

function notifications(muted: string[] | null): string {
  const count = muted?.length ?? 0
  if (count === 0) return 'toutes actives'
  return `${count} ${count === 1 ? 'ligne coupée' : 'lignes coupées'}`
}

interface Props {
  person: PersonFields
  editing: boolean
  onEdit: () => void
  /** `saved` : la correction est écrite, la fiche doit se relire. */
  onDone: (saved: boolean) => void
}

export function PersonInfoCard({ person, editing, onEdit, onDone }: Props) {
  const place = [person.postal_code, person.city].filter(Boolean).join(' · ')
  const corriger = editing ? undefined : (
    <button type="button" className="sheet-link sheet-link--button" onClick={onEdit}>
      Corriger
    </button>
  )
  return (
    <AdminCard title="Informations" Icon={Info} tone="gris" action={corriger}>
      {editing ? (
        <PersonEditForm
          person={person}
          onCancel={() => onDone(false)}
          onSaved={() => onDone(true)}
        />
      ) : (
        <dl className="sheet-rows">
          <SheetRow label="Prénom">{person.display_name || NONE}</SheetRow>
          <SheetRow label="E-mail">{person.email || NONE}</SheetRow>
          <SheetRow label="Téléphone">{person.phone || NONE}</SheetRow>
          <SheetRow label="Identifiant">{person.handle ? `@${person.handle}` : NONE}</SheetRow>
          <SheetRow label="Code postal">{place || NONE}</SheetRow>
          <SheetRow label="Notifications">{notifications(person.push_muted)}</SheetRow>
          <SheetRow label="Connexion">Code par e-mail</SheetRow>
        </dl>
      )}
    </AdminCard>
  )
}
