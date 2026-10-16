/**
 * QUOI     — les écritures de la liste des prospects : une cellule, une ligne ajoutée, supprimée,
 *            un rapprochement fait ou défait, un import.
 * POURQUOI — elles vont droit sur la table, que la RLS réserve aux admins : pas de fonction maison
 *            par champ.
 * ATTENTION — un échec lève une Error au message français (writeError) : la cellule l'affiche.
 */
import { writeError } from '@/lib/prospect'
import type { NewProspect } from '@/lib/prospect-import'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type ProspectPatch = Database['public']['Tables']['prospects']['Update']

function check(error: { code?: string; message: string } | null) {
  if (error) throw new Error(writeError(error))
}

export async function updateProspect(id: string, patch: ProspectPatch) {
  const { error } = await supabase.from('prospects').update(patch).eq('id', id)
  check(error)
}

export async function insertProspect(fields: ProspectPatch) {
  const { error } = await supabase.from('prospects').insert(fields)
  check(error)
}

export async function deleteProspect(id: string) {
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  check(error)
}

export async function unlinkProspect(id: string) {
  await updateProspect(id, { user_id: null, linked_at: null, linked_by: null })
}

export async function linkProspect(prospectId: string, userId: string, par: string) {
  const { error } = await supabase.rpc('admin_rapprocher', {
    p_prospect: prospectId,
    p_user: userId,
    p_par: par,
  })
  check(error)
}

const EMAIL_CHUNK = 100

/** Les e-mails du fichier déjà dans la liste, demandés par paquets (l'adresse a une longueur max). */
export async function knownEmails(emails: string[]): Promise<Set<string>> {
  const known = new Set<string>()
  for (let start = 0; start < emails.length; start += EMAIL_CHUNK) {
    const { data, error } = await supabase
      .from('prospects')
      .select('email')
      .in('email', emails.slice(start, start + EMAIL_CHUNK))
    check(error)
    for (const row of data ?? []) if (row.email) known.add(row.email)
  }
  return known
}

/** Un seul envoi ; un e-mail arrivé entre l'aperçu et l'import est ignoré, pas dupliqué. */
export async function importProspects(rows: NewProspect[]) {
  const { error } = await supabase
    .from('prospects')
    .upsert(rows, { onConflict: 'email', ignoreDuplicates: true })
  check(error)
}
