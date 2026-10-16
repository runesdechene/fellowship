/**
 * QUOI     — « Suivi par … » en haut de la page d'un prospect : le menu qui change son suiveur.
 * POURQUOI — prendre le relais d'un collègue, c'est changer le suiveur (Uriel, 16/10/2026) ; seuls
 *            les comptes qui ont une adresse d'envoi active peuvent suivre un prospect.
 */
import { useState } from 'react'
import { updateProspect } from './prospect-writes'
import type { Sender } from './useProspect'

interface Props {
  prospectId: string
  ownerId: string | null
  senders: Sender[]
  onChanged: () => void
}

export function OwnerMenu({ prospectId, ownerId, senders, onChanged }: Props) {
  const [problem, setProblem] = useState<string | null>(null)
  const people = senders.filter((s) => s.active)

  async function change(next: string) {
    setProblem(null)
    try {
      await updateProspect(prospectId, { owner_id: next || null })
      onChanged()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'Le changement n’a pas abouti.')
    }
  }

  return (
    <label className="prospect-owner">
      <span className="prospect-owner__label">Suivi par</span>
      <select
        className="prospect-owner__select"
        value={ownerId ?? ''}
        onChange={(event) => void change(event.target.value)}
      >
        <option value="">Personne</option>
        {people.map((s) => (
          <option key={s.id} value={s.user_id}>
            {s.user_name ?? s.display_name}
          </option>
        ))}
      </select>
      {problem && <span className="prospect-cell__problem">{problem}</span>}
    </label>
  )
}
