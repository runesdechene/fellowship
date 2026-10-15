/**
 * QUOI     — le bloc Informations, en lecture : prénom, e-mail, téléphone, identifiant, code postal,
 *            notifications, mode de connexion.
 * POURQUOI — la correction de ces champs viendra s'y poser ; pour l'instant on lit.
 */
import { Info } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { SheetRow } from '@/components/ui/SheetRow'
import type { PersonFields } from './useAdminPerson'

const NONE = '—'

function notifications(muted: string[] | null): string {
  const count = muted?.length ?? 0
  if (count === 0) return 'toutes actives'
  return `${count} ${count === 1 ? 'ligne coupée' : 'lignes coupées'}`
}

export function PersonInfoCard({ person }: { person: PersonFields }) {
  const place = [person.postal_code, person.city].filter(Boolean).join(' · ')
  return (
    <AdminCard title="Informations" Icon={Info} tone="gris">
      <dl className="sheet-rows">
        <SheetRow label="Prénom">{person.display_name || NONE}</SheetRow>
        <SheetRow label="E-mail">{person.email || NONE}</SheetRow>
        <SheetRow label="Téléphone">{person.phone || NONE}</SheetRow>
        <SheetRow label="Identifiant">{person.handle ? `@${person.handle}` : NONE}</SheetRow>
        <SheetRow label="Code postal">{place || NONE}</SheetRow>
        <SheetRow label="Notifications">{notifications(person.push_muted)}</SheetRow>
        <SheetRow label="Connexion">Code par e-mail</SheetRow>
      </dl>
    </AdminCard>
  )
}
