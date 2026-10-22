/**
 * QUOI     — charge la page d'un prospect : le prospect, son fil, les modèles et les expéditeurs.
 * POURQUOI — la page écrit et envoie (messagerie de prospection, lot 3b) : elle a besoin des quatre
 *            à la fois. `reload` relance tout après un envoi ou une modification.
 * ATTENTION — les types générés disent toutes les colonnes d'une fonction remplies : ces types-ci
 *            disent la vérité (un prospect peut n'avoir ni nom ni suiveur).
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

export interface ProspectDetail {
  id: string
  name: string | null
  /** Comment lui écrire : `femme`, `homme`, ou null tant qu'on ne sait pas. */
  gender: string | null
  brand: string | null
  activity: string | null
  activity_secondary: string | null
  city: string | null
  email: string | null
  phone: string | null
  website: string | null
  social_primary: string | null
  social_secondary: string | null
  source: string | null
  note: string | null
  contact_channel: string | null
  contacted_on: string | null
  email_status: string
  a_relancer: boolean
  user_id: string | null
  user_name: string | null
  owner_id: string | null
  owner_name: string | null
  unsubscribed_at: string | null
  created_at: string
}

export interface ThreadMessage {
  id: string
  direction: string
  sender_user_id: string | null
  sender_name: string | null
  from_email: string
  to_email: string
  subject: string
  body_text: string
  delivery: string | null
  has_attachments: boolean
  at: string
}

export type TemplateKind = 'premier_contact' | 'relance' | 'bienvenue'

export interface Template {
  id: string
  kind: string
  name: string
  subject: string
  body: string
  archived_at: string | null
  envois: number
  reponses: number
}

export interface Sender {
  id: string
  user_id: string
  user_name: string | null
  alias: string
  display_name: string
  signature: string
  active: boolean
  envoyes_aujourdhui: number
  palier: number
}

export interface ProspectSheet {
  prospect: ProspectDetail
  messages: ThreadMessage[]
  templates: Template[]
  senders: Sender[]
}

async function loadProspect(id: string): Promise<ProspectSheet> {
  const [prospect, messages, templates, senders] = await Promise.all([
    supabase.rpc('admin_prospect', { p_id: id }),
    supabase.rpc('admin_prospect_messages', { p_id: id }),
    supabase.rpc('admin_prospect_modeles'),
    supabase.rpc('admin_prospect_expediteurs'),
  ])
  const found: ProspectDetail | undefined = must(prospect)[0]
  if (!found) throw new Error('Ce prospect n’existe plus.')
  return {
    prospect: found,
    messages: must(messages),
    templates: must(templates),
    senders: must(senders),
  }
}

export function useProspect(id: string) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ data: ProspectSheet | null; error: string | null }>({
    data: null,
    error: null,
  })
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadProspect(id)
        if (cancelled) return
        setState({ data, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [id, version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { ...state, reload }
}
