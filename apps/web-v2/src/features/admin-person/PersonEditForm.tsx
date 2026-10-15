/**
 * QUOI     — le formulaire de correction d'une personne, posé dans le bloc Informations : prénom,
 *            identifiant, téléphone, code postal.
 * POURQUOI — écrit par `admin_corriger_personne` (gardée admin, vide = effacé). L'e-mail n'y est
 *            pas : il change aussi l'adresse de connexion. Les valeurs saisies restent si l'écriture
 *            échoue.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
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
    handle: person.handle || '',
    phone: person.phone || '',
    postalCode: person.postal_code || '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  async function save() {
    setSaving(true)
    setError(null)
    const { error: failure } = await supabase.rpc('admin_corriger_personne', {
      p_id: person.actor_id,
      p_display_name: form.displayName,
      p_handle: form.handle,
      p_phone: form.phone,
      p_postal_code: form.postalCode,
    })
    setSaving(false)
    if (failure) setError(readable(failure))
    else onSaved()
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
