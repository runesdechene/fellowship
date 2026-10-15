/**
 * QUOI     — le formulaire de correction d'une personne, posé dans le bloc Informations : prénom,
 *            e-mail, identifiant, téléphone, code postal.
 * POURQUOI — écrit par `admin_corriger_personne` (gardée admin, vide = effacé). L'e-mail n'y est
 *            échoue. L'e-mail change aussi l'adresse de connexion : il passe par la fonction
 *            admin-compte, après les autres champs, et seulement s'il a changé.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { changeEmail } from '@/lib/admin-functions'
import { supabase } from '@/lib/supabase'
import type { PersonFields } from './useAdminPerson'

interface Props {
  person: PersonFields
  onCancel: () => void
  onSaved: () => void
}

function readable(error: { code?: string; message: string }): string {
  return error.code === '23505' ? 'Cet identifiant est déjà pris.' : error.message
}

export function PersonEditForm({ person, onCancel, onSaved }: Props) {
  const [form, setForm] = useState({
    displayName: person.display_name || '',
    email: person.email || '',
    handle: person.handle || '',
    phone: person.phone || '',
    postalCode: person.postal_code || '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  async function save() {
    const email = form.email.trim()
    if (!email) {
      setError('L’e-mail ne peut pas être vide.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: failure } = await supabase.rpc('admin_corriger_personne', {
      p_id: person.actor_id,
      p_display_name: form.displayName,
      p_handle: form.handle,
      p_phone: form.phone,
      p_postal_code: form.postalCode,
    })
    if (failure) {
      setSaving(false)
      setError(readable(failure))
      return
    }
    if (email !== (person.email || '')) {
      try {
        await changeEmail(person.actor_id, email)
      } catch (problem) {
        setSaving(false)
        const reason = problem instanceof Error ? problem.message : 'erreur inconnue'
        setError(`Les autres champs sont enregistrés ; l’e-mail n’a pas changé : ${reason}`)
        return
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <form
      className="sheet-form"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <div className="fields">
        <Field label="Prénom">
          <Input value={form.displayName} onChange={set('displayName')} />
        </Field>
        <Field label="E-mail">
          <Input value={form.email} onChange={set('email')} type="email" />
        </Field>
        <Field label="Identifiant">
          <Input value={form.handle} onChange={set('handle')} />
        </Field>
        <Field label="Téléphone">
          <Input value={form.phone} onChange={set('phone')} type="tel" />
        </Field>
        <Field label="Code postal">
          <Input value={form.postalCode} onChange={set('postalCode')} inputMode="numeric" />
        </Field>
      </div>
      {error && (
        <p className="sheet-form__error" role="alert">
          {error}
        </p>
      )}
      <div className="sheet-form__actions">
        <Button type="submit" disabled={saving}>
          Enregistrer
        </Button>
        <Button onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
