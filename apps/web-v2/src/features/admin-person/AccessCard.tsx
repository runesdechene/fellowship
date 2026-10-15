/**
 * QUOI     — le bloc Accès : le rôle (qui se change), puis Suspendre / Réactiver et Supprimer avec
 *            leur phrase.
 * POURQUOI — le rôle s'écrit sur `users` ; le déclencheur `protect_user_role` ramène l'ancien en
 *            silence si l'appelant n'est pas admin, d'où la relecture qui confirme le changement.
 *            Suspendre et supprimer passent par les fonctions serveur (admin-compte, delete-account).
 * ATTENTION — sa propre fiche ne change pas son rôle et n'offre ni Suspendre ni Supprimer ; donner
 *            « Admin » ou suspendre demande une phrase de confirmation.
 */
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminCard } from '@/components/ui/AdminCard'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { reactivateAccount, suspendAccount } from '@/lib/admin-functions'
import { useAuth } from '@/lib/auth'
import { formatFullDate } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import { DeletePersonDialog } from './DeletePersonDialog'
import { ROLES } from './roles'
import type { PersonFields } from './useAdminPerson'

export function AccessCard({ person, onChanged }: { person: PersonFields; onChanged: () => void }) {
  const { person: me } = useAuth()
  const own = me?.actor_id === person.actor_id
  const navigate = useNavigate()
  const [asking, setAsking] = useState(false)
  const [suspending, setSuspending] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

  async function toggleSuspension() {
    setSuspending(false)
    setSaving(true)
    setError(null)
    try {
      await (person.suspended_at ? reactivateAccount : suspendAccount)(person.actor_id)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'L’action n’a pas abouti.')
    }
    setSaving(false)
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
      {!own && (
        <>
          <div className="access-row">
            <p className="access-note">
              {person.suspended_at
                ? `Suspendu depuis le ${formatFullDate(new Date(person.suspended_at))} : la connexion est bloquée.`
                : 'Bloque la connexion ; le contenu reste visible.'}
            </p>
            <Button disabled={saving} onClick={() => setSuspending(true)}>
              {person.suspended_at ? 'Réactiver' : 'Suspendre'}
            </Button>
          </div>
          {suspending && (
            <div className="access-confirm">
              <p className="access-note">
                {person.suspended_at
                  ? 'Rouvrir la connexion de ce compte ?'
                  : 'Bloquer la connexion de ce compte ?'}
              </p>
              <Button onClick={() => void toggleSuspension()}>Confirmer</Button>
              <Button onClick={() => setSuspending(false)}>Annuler</Button>
            </div>
          )}
          <div className="access-row">
            <p className="access-note">Efface le compte et ses données, définitivement.</p>
            <button type="button" className="access-danger" onClick={() => setDeleting(true)}>
              Supprimer…
            </button>
          </div>
          {deleting && (
            <DeletePersonDialog
              person={person}
              onClose={() => setDeleting(false)}
              onDeleted={() => void navigate('/admin/comptes?vue=personnes')}
            />
          )}
        </>
      )}
    </AdminCard>
  )
}
