/**
 * QUOI     — le formulaire de correction d'une enseigne, posé dans le bloc Informations : nom
 *            (requis), métier, ville, adresse de vitrine, raison sociale, SIREN.
 * POURQUOI — écrit par `admin_corriger_enseigne` (gardée admin, vide = effacé). Les erreurs connues
 *            sont dites en français ; les valeurs saisies restent si l'écriture échoue.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { supabase } from '@/lib/supabase'
import type { EntityFields } from './useAdminEntity'

interface Props {
  entity: EntityFields
  onCancel: () => void
  onSaved: () => void
}

function readable(error: { code?: string; message: string }): string {
  if (error.code === '23505') return 'Cette adresse de vitrine est déjà prise.'
  if (error.code === '22023') return 'Le nom est requis.'
  return error.message
}

export function EntityEditForm({ entity, onCancel, onSaved }: Props) {
  const [form, setForm] = useState({
    brandName: entity.brand_name || '',
    craftType: entity.craft_type || '',
    city: entity.city || '',
    slug: entity.public_slug || '',
    legalName: entity.legal_name || '',
    siren: entity.siren || '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  async function save() {
    setSaving(true)
    setError(null)
    const { error: failure } = await supabase.rpc('admin_corriger_enseigne', {
      p_id: entity.actor_id,
      p_brand_name: form.brandName,
      p_craft_type: form.craftType,
      p_city: form.city,
      p_public_slug: form.slug,
      p_legal_name: form.legalName,
      p_siren: form.siren,
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
        <Field label="Nom" required>
          <Input value={form.brandName} onChange={set('brandName')} required />
        </Field>
        <Field label="Métier">
          <Input value={form.craftType} onChange={set('craftType')} />
        </Field>
        <Field label="Ville">
          <Input value={form.city} onChange={set('city')} />
        </Field>
        <Field label="Adresse de vitrine">
          <Input value={form.slug} onChange={set('slug')} />
        </Field>
        <Field label="Raison sociale">
          <Input value={form.legalName} onChange={set('legalName')} />
        </Field>
        <Field label="SIREN">
          <Input value={form.siren} onChange={set('siren')} inputMode="numeric" />
        </Field>
      </div>
      {error && (
        <p className="sheet-form__error" role="alert">
          {error}
        </p>
      )}
      <div className="sheet-form__actions">
        <Button type="submit" variant="action" disabled={saving}>
          Enregistrer
        </Button>
        <Button onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
