/**
 * QUOI     — écrire au prospect : choisir un modèle, retoucher l'objet et le texte, envoyer depuis
 *            son adresse @equipe.flw.sh (maquettes 2355:2 et 2355:273).
 * POURQUOI — modèles + retouche, envoi un par un (Uriel, 16/10/2026) ; c'est le serveur
 *            (prospect-send) qui ajoute la signature, le pied de désinscription et le fil.
 * ATTENTION — on n'écrit que depuis sa propre adresse : un prospect suivi par un autre propose
 *            « Prendre le relais ». La page remonte ce bloc (clé) après chaque envoi.
 */
import { Send } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminCard } from '@/components/ui/AdminCard'
import { Button } from '@/components/ui/Button'
import { sendProspectEmail } from '@/lib/admin-functions'
import { formatFullDate } from '@/lib/dates'
import { percent } from '@/lib/prospect'
import {
  fillTemplate,
  pickTemplate,
  previousWriter,
  relayIntro,
  templateValues,
} from '@/lib/prospect-template'
import type { ProspectSheet, Template } from './useProspect'

const GROUPS = [
  { kind: 'premier_contact', label: 'Premier contact' },
  { kind: 'relance', label: 'Relance' },
  { kind: 'bienvenue', label: 'Bienvenue' },
] as const

interface Props {
  sheet: ProspectSheet
  me: string
  onSent: () => void
  onTakeOver: () => void
}

function optionLabel(t: Template): string {
  return `${t.name} · ${t.envois} envois · ${percent(t.reponses, t.envois)} % de réponses`
}

export function ComposeCard({ sheet, me, onSent, onTakeOver }: Props) {
  const { prospect, messages, templates, senders } = sheet
  const [search] = useSearchParams()
  const live = templates.filter((t) => !t.archived_at)
  const values = templateValues(prospect)
  const outgoing = messages.filter((m) => m.direction === 'out')
  const intro = relayIntro(previousWriter(messages, me))
  const firstSubject = messages[0]?.subject

  function draftFor(id: string | null) {
    const template = live.find((t) => t.id === id)
    if (!template) return { subject: firstSubject ? `Re : ${firstSubject}` : '', body: intro }
    return {
      subject: fillTemplate(template.subject, values),
      body: intro + fillTemplate(template.body, values),
    }
  }

  // Un prospect « À relancer » dont le dernier message est un envoi : le modèle de relance est prêt.
  const lastIsOut = messages[messages.length - 1]?.direction === 'out'
  const wanted = search.get('modele') ?? (prospect.a_relancer && lastIsOut ? 'relance' : null)
  const initial = pickTemplate(live, wanted, outgoing.length > 0)
  const [templateId, setTemplateId] = useState<string | null>(initial)
  const [draft, setDraft] = useState(() => draftFor(initial))
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const firstName = values['prénom'] || prospect.brand || 'ce prospect'
  const title = outgoing.length ? `Répondre à ${firstName}` : `Premier contact avec ${firstName}`
  const mine = senders.find((s) => s.user_id === me && s.active)

  function blocked(): ReactNode {
    if (prospect.unsubscribed_at) {
      return `Désinscription le ${formatFullDate(new Date(prospect.unsubscribed_at))} : plus aucun e-mail ne peut partir vers ${prospect.name ?? prospect.email ?? 'ce prospect'}.`
    }
    if (!prospect.email) return 'Ajoute son e-mail dans les informations pour lui écrire.'
    if (prospect.owner_id && prospect.owner_id !== me) {
      return (
        <>
          Ce prospect est suivi par {prospect.owner_name ?? 'quelqu’un d’autre'}.{' '}
          <Button onClick={onTakeOver}>Prendre le relais</Button>
        </>
      )
    }
    if (!mine) {
      return (
        <>
          Tu n’as pas encore d’adresse d’envoi.{' '}
          <Link to="/admin/prospects/modeles" className="sheet-link">
            L’ajouter dans Modèles et expéditeurs
          </Link>
        </>
      )
    }
    return null
  }

  async function send() {
    setBusy(true)
    setProblem(null)
    try {
      await sendProspectEmail({
        prospectId: prospect.id,
        templateId,
        subject: draft.subject,
        body: draft.body,
      })
      onSent()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’envoi n’a pas abouti.')
      setBusy(false)
    }
  }

  const stop = blocked()
  const lastOut = outgoing[outgoing.length - 1]

  return (
    <AdminCard title={title} Icon={Send} tone="ocre">
      {stop ? (
        <p className="prospect-compose__blocked">{stop}</p>
      ) : (
        <div className="prospect-compose">
          <label className="prospect-compose__row">
            <span className="prospect-compose__label">Modèle</span>
            <select
              className="prospect-compose__field prospect-compose__field--choice"
              value={templateId ?? ''}
              onChange={(event) => {
                const id = event.target.value || null
                setTemplateId(id)
                setDraft(draftFor(id))
              }}
            >
              <option value="">Aucun — réponse libre</option>
              {GROUPS.map(({ kind, label }) => (
                <optgroup key={kind} label={label}>
                  {live
                    .filter((t) => t.kind === kind)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {optionLabel(t)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="prospect-compose__row">
            <span className="prospect-compose__label">De</span>
            <span className="prospect-compose__field">
              {mine?.display_name} · {mine?.alias}@equipe.flw.sh
            </span>
          </div>
          <div className="prospect-compose__row">
            <span className="prospect-compose__label">À</span>
            <span className="prospect-compose__field">
              {prospect.name ? `${prospect.name} · ` : ''}
              {prospect.email}
            </span>
          </div>
          <label className="prospect-compose__row">
            <span className="prospect-compose__label">Objet</span>
            <input
              className="prospect-compose__field"
              value={draft.subject}
              onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
            />
          </label>
          <textarea
            className="prospect-compose__text"
            aria-label="Texte de l’e-mail"
            rows={9}
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          />
          {lastOut?.delivery === 'rebond' && (
            <p className="prospect-compose__problem">
              Le dernier e-mail a rebondi : l’adresse est peut-être fausse.
            </p>
          )}
          {problem && <p className="prospect-compose__problem">{problem}</p>}
          <div className="prospect-compose__foot">
            <span className="prospect-compose__note">
              Un lien de désinscription est ajouté au bas de chaque e-mail.
            </span>
            <Button variant="action" onClick={() => void send()} disabled={busy}>
              {busy ? 'Envoi…' : 'Envoyer'}
            </Button>
          </div>
        </div>
      )}
    </AdminCard>
  )
}
