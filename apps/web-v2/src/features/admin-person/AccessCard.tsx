/**
 * QUOI     — le bloc Accès : le rôle (qui se change), puis Suspendre et Supprimer avec leur phrase.
 * POURQUOI — le rôle s'écrit sur `users` ; le déclencheur `protect_user_role` ramène l'ancien en
 *            silence si l'appelant n'est pas admin, d'où la relecture qui confirme le changement.
 *            Suspendre et Supprimer seront branchés plus tard (maquette 2344:2).
 * ATTENTION — sa propre fiche ne change pas son rôle ; donner « Admin » demande une phrase de
 *            confirmation.
 */
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { AdminCard } from '@/components/ui/AdminCard'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { ROLES } from './roles'
import type { PersonFields } from './useAdminPerson'

export function AccessCard({ person, onChanged }: { person: PersonFields; onChanged: () => void }) {
  const { person: me } = useAuth()
  const own = me?.actor_id === person.actor_id
  const [asking, setAsking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function changeRole(role: string) {
    setAsking(false)
    setSaving(true)
    setError(null)
    const { error: failure } = await supabase
      .from('users')
      .update({ role })
      .eq('actor_id', person.actor_id)
    const { data: read } = failure
      ? { data: null }
      : await supabase.from('users').select('role').eq('actor_id', person.actor_id).maybeSingle()
    setSaving(false)
    if (failure) setError(failure.message)
    else if (read?.role !== role) setError('Le rôle n’a pas changé.')
    onChanged()
  }

  return (
    <AdminCard title="Accès" Icon={ShieldCheck} tone="brique">
      <div className="access-block">
        <Segmented
          label="Rôle"
          options={ROLES}
          value={person.role}
          onChange={(role) => (role === 'admin' ? setAsking(true) : void changeRole(role))}
          disabled={own || saving}
        />
        {own && <p className="access-note">Ton propre rôle ne se change pas ici.</p>}
        {asking && (
          <div className="access-confirm">
            <p className="access-note">
              Donner l’administration à {person.display_name || person.email} ?
            </p>
            <Button onClick={() => void changeRole('admin')}>Confirmer</Button>
            <Button onClick={() => setAsking(false)}>Annuler</Button>
          </div>
        )}
        {error && (
          <p className="sheet-form__error" role="alert">
            {error}
          </p>
        )}
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
