// send-push : envoie sur le téléphone une notification qui vient d'arriver dans la cloche.
// Appelée par le déclencheur on_notification_send_push (pg_net), avec l'identifiant de la
// notification et l'en-tête X-Push-Secret (même valeur dans le Vault et dans PUSH_TRIGGER_SECRET).
//
// Qui la reçoit : la personne destinataire, ou chaque membre de l'enseigne destinataire ; sauf qui
// a coupé sa ligne (users.push_muted). Le texte est la phrase de la cloche (phrases/, recopiées de
// la V2 par apps/web-v2/scripts/sync-push-phrases.mjs). Une adresse morte (404, 410) est effacée.
//
// Auth : verify_jwt = false (config.toml) — le secret d'en-tête remplace le JWT.
// Spec : docs/superpowers/specs/2026-10-09-lot-8e-push-telephone-v2-design.md §7.

import webpush from 'npm:web-push@3.6.7'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { isPushEndpoint, lineOf, pushMessage } from './phrases/push-lines.ts'

const SECRET = Deno.env.get('PUSH_TRIGGER_SECRET') ?? ''
const VAPID = {
  subject: Deno.env.get('VAPID_SUBJECT') ?? '',
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
}

const done = () => new Response('ok')

// La personne, ou les membres de l'enseigne.
async function peopleOf(actorId: string): Promise<string[]> {
  const db = getSupabaseAdmin()
  const { data: actor } = await db.from('actors').select('kind').eq('id', actorId).maybeSingle()
  if (actor?.kind === 'person') return [actorId]
  const { data: members } = await db
    .from('memberships')
    .select('user_actor_id')
    .eq('entity_actor_id', actorId)
  return (members ?? []).map((row) => row.user_actor_id as string)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!SECRET || req.headers.get('x-push-secret') !== SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Les clés se posent ici, pas au chargement : une clé manquante rendrait sinon chaque appel en
  // erreur, jusqu'au refus du secret (relecture du 10/10/2026).
  if (!VAPID.subject || !VAPID.publicKey || !VAPID.privateKey) {
    return new Response('VAPID keys missing', { status: 500 })
  }
  webpush.setVapidDetails(VAPID.subject, VAPID.publicKey, VAPID.privateKey)

  const { notification_id } = (await req.json().catch(() => ({}))) as {
    notification_id?: string
  }
  if (!notification_id) return new Response('Bad request', { status: 400 })

  const db = getSupabaseAdmin()
  const { data: notification } = await db
    .from('notifications')
    .select('type, data, actor_id')
    .eq('id', notification_id)
    .maybeSingle()
  if (!notification) return done()

  const line = lineOf(notification.type)
  const message = pushMessage(
    notification.type,
    (notification.data ?? {}) as Record<string, unknown>,
  )
  if (!line || !message) return done()

  const people = await peopleOf(notification.actor_id)
  if (people.length === 0) return done()
  const { data: users } = await db
    .from('users')
    .select('actor_id, push_muted')
    .in('actor_id', people)
  const listening = (users ?? [])
    .filter((user) => !(user.push_muted as string[]).includes(line))
    .map((user) => user.actor_id as string)
  if (listening.length === 0) return done()

  const { data: phones } = await db
    .from('push_subscriptions')
    .select('id, endpoint, keys')
    .in('user_id', listening)

  const payload = JSON.stringify(message)
  await Promise.all(
    (phones ?? [])
      // Seulement les services de notification des navigateurs (la base les garde déjà).
      .filter((phone) => isPushEndpoint(phone.endpoint as string))
      .map(async (phone) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: phone.endpoint,
              keys: phone.keys as { p256dh: string; auth: string },
            },
            payload,
            { TTL: 86400 },
          )
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await db.from('push_subscriptions').delete().eq('id', phone.id)
          } else {
            console.error('[send-push] envoi raté', status, (error as Error).message)
          }
        }
      }),
  )
  return done()
})
