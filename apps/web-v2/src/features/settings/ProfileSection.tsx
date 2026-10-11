/**
 * QUOI     — la section Profil des Réglages : photo, nom affiché, ville, code postal, genre, et le
 *            chemin vers sa vitrine.
 * POURQUOI — lot 9b, maquette 2206:691 : la personne (`users`) ; l'identité publique de l'enseigne
 *            se règle sur la vitrine. Chaque champ s'écrit quand on le quitte, s'il a changé et
 *            qu'il est valable — jamais un nom vide en base.
 */
import { ArrowRight } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { imageProblem, resizeImage } from '@/lib/image-resize'
import { cleanProfileValue, profileProblem, SEX_OPTIONS, type ProfileField } from '@/lib/settings'
import { supabase } from '@/lib/supabase'
import { SettingCard, SettingRow } from './SettingRow'
import { useProfileSave, type SaveState, type UserPatch } from './useProfileSave'

const AVATAR_WIDTH = 512
const AVATARS = 'avatars'

const TEXT_FIELDS: ReadonlyArray<{ field: ProfileField; title: string; note?: string }> = [
  { field: 'display_name', title: 'Nom affiché' },
  { field: 'city', title: 'Ville' },
  {
    field: 'postal_code',
    title: 'Code postal',
    note: 'Sert à « Près de chez toi » dans l’Explorer',
  },
]

function isSex(value: string): value is (typeof SEX_OPTIONS)[number]['value'] {
  return SEX_OPTIONS.some((option) => option.value === value)
}

export function ProfileSection({ onSave }: { onSave: (state: SaveState) => void }) {
  const { user, person, actor, entities } = useAuth()
  const save = useProfileSave()
  const [values, setValues] = useState<Record<ProfileField, string>>({
    display_name: person?.display_name ?? '',
    city: person?.city ?? '',
    postal_code: person?.postal_code ?? '',
  })
  const [problems, setProblems] = useState<Partial<Record<ProfileField, string>>>({})
  const [sending, setSending] = useState(false)
  const [photoProblem, setPhotoProblem] = useState<string | null>(null)
  const picker = useRef<HTMLInputElement>(null)
  const entity = entities.find((item) => item.actor_id === actor?.id) ?? entities[0]

  async function write(patch: UserPatch) {
    onSave((await save(patch)) ? 'saved' : 'failed')
  }

  function leave(field: ProfileField) {
    const problem = profileProblem(field, values[field])
    setProblems((current) => ({ ...current, [field]: problem ?? undefined }))
    if (problem) return
    const next = cleanProfileValue(field, values[field])
    if (next === (person?.[field] ?? null)) return
    void write({ [field]: next })
  }

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user) return
    const problem = imageProblem(file)
    setPhotoProblem(problem)
    if (problem) return
    setSending(true)
    try {
      const blob = await resizeImage(file, AVATAR_WIDTH)
      const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${user.id}/${String(Date.now())}.${extension}`
      const { error } = await supabase.storage
        .from(AVATARS)
        .upload(path, blob, { contentType: blob.type })
      if (error) throw new Error(error.message)
      await write({ avatar_url: supabase.storage.from(AVATARS).getPublicUrl(path).data.publicUrl })
    } catch {
      setPhotoProblem('Cette image ne peut pas être utilisée.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="profil" className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">Profil</h2>
        <p className="settings-section__note">
          Ta personne. L’identité publique de ton enseigne se règle sur ta vitrine.
        </p>
      </div>
      <SettingCard>
        <SettingRow title="Photo" note="JPG ou PNG, 5 Mo au plus">
          <Avatar
            className="setting-row__avatar"
            src={person?.avatar_url}
            name={person?.display_name ?? undefined}
          />
          <Button disabled={sending} onClick={() => picker.current?.click()}>
            {sending ? 'Envoi…' : 'Changer'}
          </Button>
          <input
            ref={picker}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => void pickPhoto(event)}
          />
        </SettingRow>
        {photoProblem && <p className="setting-row__problem">{photoProblem}</p>}
        {TEXT_FIELDS.map(({ field, title, note }) => (
          <div key={field} className="setting-row__group">
            <SettingRow title={title} note={note}>
              <input
                className="control setting-input"
                aria-label={title}
                value={values[field]}
                inputMode={field === 'postal_code' ? 'numeric' : undefined}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [field]: event.target.value }))
                }}
                onBlur={() => {
                  leave(field)
                }}
              />
            </SettingRow>
            {problems[field] && <p className="setting-row__problem">{problems[field]}</p>}
          </div>
        ))}
        <SettingRow title="Genre" note="Facultatif">
          <select
            className="control setting-input"
            aria-label="Genre"
            value={person?.sex ?? 'indefini'}
            onChange={(event) => {
              const sex = event.target.value
              if (isSex(sex)) void write({ sex })
            }}
          >
            {SEX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingRow>
        {entity?.public_slug && (
          <SettingRow title="Ma vitrine" note="L’enseigne, sa présentation, ses liens, sa bannière">
            <Link className="setting-link" to={`/${entity.public_slug}`}>
              Ouvrir ma vitrine <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </SettingRow>
        )}
      </SettingCard>
    </section>
  )
}
