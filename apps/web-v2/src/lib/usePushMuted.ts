/**
 * QUOI     — les lignes coupées sur le téléphone, pour la personne connectée : les lire, en
 *            basculer une.
 * POURQUOI — lot 8e : chaque ligne des Réglages décide si elle sonne aussi sur le téléphone.
 *            users.push_muted retient les lignes coupées (d'office : « Nouveaux abonnés »), pour
 *            tous les téléphones de la personne ; send-push la lit.
 * ATTENTION — une bascule à la fois (`saving`), retour en arrière si l'écriture échoue. Après
 *            l'écriture, l'identité est relue : sinon un retour sur la page montrerait l'ancien
 *            choix.
 */
import { useCallback, useMemo, useState } from 'react'
import { useAuth } from './auth'
import type { PushLine } from './push-lines'
import { supabase } from './supabase'

export function usePushMuted() {
  const { person, reloadIdentity } = useAuth()
  const [muted, setMuted] = useState<PushLine[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const stored = person?.push_muted
  const current = useMemo(() => muted ?? ((stored ?? []) as PushLine[]), [muted, stored])

  const toggle = useCallback(
    async (line: PushLine) => {
      if (!person || saving) return
      const before = current
      const next = before.includes(line)
        ? before.filter((key) => key !== line)
        : [...before, line]
      setMuted(next)
      setSaving(true)
      setFailed(false)
      const { error } = await supabase
        .from('users')
        .update({ push_muted: next })
        .eq('actor_id', person.actor_id)
      if (error) {
        setMuted(before)
        setFailed(true)
      } else {
        await reloadIdentity()
      }
      setSaving(false)
    },
    [current, person, reloadIdentity, saving],
  )

  return { muted: current, saving, failed, toggle }
}
