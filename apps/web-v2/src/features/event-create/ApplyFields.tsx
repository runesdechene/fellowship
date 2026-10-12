/**
 * QUOI     — les champs « Pour candidater » : date limite, comment candidater, lien d'inscription,
 *            e-mail de contact, site de l'événement — dans l'ordre de la maquette 2117:2.
 * POURQUOI — la création (10b) et la modification (10c) les demandent pareil ; la modification peut
 *            en plus encadrer celui qui manquait (`highlight`).
 */
import { Field, Input } from '@/components/ui/Field'
import type { MissingField } from '@/lib/event-edit'
import { MissingHighlight } from './MissingHighlight'
import type { EventDraft, UpdateFn } from './useEventDraft'

interface ApplyFieldsProps {
  draft: EventDraft
  update: UpdateFn
  highlight?: MissingField | null
}

export function ApplyFields({ draft, update, highlight = null }: ApplyFieldsProps) {
  return (
    <>
      <MissingHighlight on={highlight === 'registration_deadline'}>
        <Field label="Date limite d’inscription">
          <Input
            type="date"
            value={draft.registrationDeadline}
            onChange={(event) => update('registrationDeadline', event.target.value)}
          />
        </Field>
      </MissingHighlight>

      <MissingHighlight on={highlight === 'registration_note'}>
        <Field label="Comment candidater">
          <Input
            value={draft.registrationNote}
            onChange={(event) => update('registrationNote', event.target.value)}
            placeholder="Ex : envoyer un dossier par mail"
          />
        </Field>
      </MissingHighlight>

      <div className="fields__row">
        <MissingHighlight on={highlight === 'registration_url'}>
          <Field label="Lien d’inscription">
            <Input
              type="url"
              value={draft.registrationUrl}
              onChange={(event) => update('registrationUrl', event.target.value)}
              placeholder="https://…"
            />
          </Field>
        </MissingHighlight>
        <MissingHighlight on={highlight === 'contact_email'}>
          <Field label="E-mail de contact">
            <Input
              type="email"
              value={draft.contactEmail}
              onChange={(event) => update('contactEmail', event.target.value)}
              placeholder="contact@exemple.fr"
            />
          </Field>
        </MissingHighlight>
      </div>

      <MissingHighlight on={highlight === 'external_url'}>
        <Field label="Site de l’événement">
          <Input
            type="url"
            value={draft.externalUrl}
            onChange={(event) => update('externalUrl', event.target.value)}
            placeholder="https://…"
          />
        </Field>
      </MissingHighlight>
    </>
  )
}
