/**
 * QUOI     — les écritures de la liste des prospects : une cellule, une ligne ajoutée, supprimée,
 *            un rapprochement fait ou défait, un import, les modèles et les expéditeurs.
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

/** La base refuse de supprimer un prospect désinscrit (il reviendrait par un réimport) : aucune ligne. */
export async function deleteProspect(id: string) {
  const { data, error } = await supabase.from('prospects').delete().eq('id', id).select('id')
  check(error)
  if (!data?.length) {
    throw new Error(
      'Ce prospect est désinscrit : il reste dans la liste pour ne plus jamais lui écrire.',
    )
  }
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

export interface TemplateInput {
  id?: string
  kind: string
  name: string
  subject: string
  body: string
}

export async function saveTemplate({ id, ...fields }: TemplateInput) {
  const { error } = id
    ? await supabase.from('prospect_templates').update(fields).eq('id', id)
    : await supabase.from('prospect_templates').insert(fields)
  check(error)
}

/** Un modèle utilisé garde ses chiffres : il s'archive, il ne se supprime pas. */
export async function archiveTemplate(id: string) {
  const { error } = await supabase
    .from('prospect_templates')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  check(error)
}

export interface SenderInput {
  id?: string
  user_id: string
  alias: string
  display_name: string
  signature: string
  active: boolean
}

export async function saveSender({ id, ...fields }: SenderInput) {
  const { error } = id
    ? await supabase.from('prospect_senders').update(fields).eq('id', id)
    : await supabase.from('prospect_senders').insert(fields)
  check(error)
}

/** Les prospects d'un suiveur qui part passent à un autre, ou à personne. */
export async function reassignProspects(fromUser: string, toUser: string | null) {
  const { error } = await supabase
    .from('prospects')
    .update({ owner_id: toUser })
    .eq('owner_id', fromUser)
  check(error)
}

/** Ranger une réponse non classée sous un prospect : elle rejoint son fil, il passe « Répondu ». */
export async function fileMessage(messageId: string, prospectId: string) {
  const { error } = await supabase.rpc('admin_ranger_message', {
    p_message: messageId,
    p_prospect: prospectId,
  })
  check(error)
}

/** Un nouveau prospect, et l'identifiant pour y ranger la réponse qui l'a fait naître. */
export async function createProspect(fields: ProspectPatch): Promise<string> {
  const { data, error } = await supabase.from('prospects').insert(fields).select('id').single()
  check(error)
  if (!data) throw new Error('Le prospect n’a pas été créé.')
  return data.id
}
