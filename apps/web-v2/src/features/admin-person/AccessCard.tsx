/**
 * QUOI     — le bloc Accès, en lecture : le rôle, puis Suspendre et Supprimer avec leur phrase.
 * POURQUOI — le rôle et les deux actions seront branchés plus tard ; en attendant ils se lisent,
 *            désactivés, tels que la maquette 2344:2 les pose.
 */
import { ShieldCheck } from 'lucide-react'
import { AdminCard } from '@/components/ui/AdminCard'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import type { PersonFields } from './useAdminPerson'

const ROLES = [
  { value: 'user', label: 'Utilisateur' },
  { value: 'v2', label: 'V2' },
  { value: 'admin', label: 'Admin' },
]

export function AccessCard({ person }: { person: PersonFields }) {
  return (
    <AdminCard title="Accès" Icon={ShieldCheck} tone="brique">
      <div className="access-block">
        <Segmented
          label="Rôle"
          options={ROLES}
          value={person.role}
          onChange={() => undefined}
          disabled
        />
        <p className="access-note">
          « V2 » ouvre la nouvelle application, « Admin » ouvre aussi cette administration.
        </p>
      </div>
      <div className="access-row">
        <p className="access-note">
          {person.suspended_at
            ? 'Le compte est suspendu : la connexion est bloquée.'
            : 'Bloque la connexion ; le contenu reste visible.'}
        </p>
        <Button disabled>{person.suspended_at ? 'Réactiver' : 'Suspendre'}</Button>
      </div>
      <div className="access-row">
        <p className="access-note">Efface le compte et ses données, définitivement.</p>
        <Button disabled>Supprimer</Button>
      </div>
    </AdminCard>
  )
}
