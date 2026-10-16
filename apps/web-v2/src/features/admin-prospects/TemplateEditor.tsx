/**
 * QUOI     — l'éditeur d'un modèle : nom, usage, objet, texte, et les emplacements à insérer au
 *            curseur ({prénom}, {marque}…).
 * POURQUOI — les admins écrivent leurs modèles (maquette 2356:2) ; la signature et le lien de
 *            désinscription s'ajoutent à l'envoi, pas ici.
 * ATTENTION — la page remonte l'éditeur (clé) quand on change de modèle.
 */
import { FilePen } from 'lucide-react'
import { useRef, useState } from 'react'
import { AdminCard } from '@/components/ui/AdminCard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Segmented } from '@/components/ui/Segmented'
import { TEMPLATE_KINDS } from '@/lib/prospect'
import { archiveTemplate, saveTemplate } from './prospect-writes'
import type { Template } from './useProspect'

const PLACES = ['{prénom}', '{marque}', '{activité}', '{ville}', '{source}'] as const

type Kind = (typeof TEMPLATE_KINDS)[number]['value']

interface Props {
  template: Template | null
  onDone: () => void
}

function kindOf(value: string | undefined): Kind {
  return TEMPLATE_KINDS.find((k) => k.value === value)?.value ?? 'premier_contact'
}

export function TemplateEditor({ template, onDone }: Props) {
  const [form, setForm] = useState({
    name: template?.name ?? '',
    kind: kindOf(template?.kind),
    subject: template?.subject ?? '',
    body: template?.body ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)
  const text = useRef<HTMLTextAreaElement>(null)

  function insert(place: string) {
    const area = text.current
    const at = area?.selectionStart ?? form.body.length
    setForm({ ...form, body: form.body.slice(0, at) + place + form.body.slice(at) })
    area?.focus()
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setProblem(null)
    try {
      await action()
      onDone()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’enregistrement n’a pas abouti.')
      setBusy(false)
    }
  }

  return (
    <AdminCard title={template?.name ?? 'Nouveau modèle'} Icon={FilePen} tone="gris">
      <div className="template-editor">
        <label className="template-editor__field">
          <span className="template-editor__label">Nom</span>
          <input
            className="prospect-compose__field"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <div className="template-editor__field">
          <span className="template-editor__label">Usage</span>
          <Segmented
            label="Usage"
            options={TEMPLATE_KINDS.map(({ value, label }) => ({ value, label }))}
            value={form.kind}
            onChange={(kind) => setForm({ ...form, kind })}
          />
        </div>
        <label className="template-editor__field">
          <span className="template-editor__label">Objet</span>
          <input
            className="prospect-compose__field"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
          />
        </label>
        <label className="template-editor__field">
          <span className="template-editor__label">Texte</span>
          <textarea
            ref={text}
            className="prospect-compose__text"
            rows={10}
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
        </label>
        <div className="template-editor__places">
          <span className="template-editor__label">Insérer :</span>
          {PLACES.map((place) => (
            <button
              key={place}
              type="button"
              className="template-editor__place"
              onClick={() => insert(place)}
            >
              {place}
            </button>
          ))}
        </div>
        <p className="template-editor__label">
          La signature de l’expéditeur et le lien de désinscription s’ajoutent seuls.
        </p>
        {problem && <p className="prospect-compose__problem">{problem}</p>}
        <div className="template-editor__actions">
          {template && (
            <Button onClick={() => setArchiving(true)} disabled={busy}>
              Archiver
            </Button>
          )}
          <Button onClick={onDone} disabled={busy}>
            Annuler
          </Button>
          <Button
            variant="action"
            disabled={busy || !form.name.trim()}
            onClick={() => void run(() => saveTemplate({ id: template?.id, ...form }))}
          >
            Enregistrer
          </Button>
        </div>
      </div>
      {archiving && template && (
        <ConfirmDialog
          title="Archiver ce modèle ?"
          text="Il ne sera plus proposé. Ses envois et ses réponses restent comptés."
          confirmLabel="Archiver"
          busy={busy}
          problem={problem}
          onConfirm={() => void run(() => archiveTemplate(template.id))}
          onClose={() => setArchiving(false)}
        />
      )}
    </AdminCard>
  )
}
