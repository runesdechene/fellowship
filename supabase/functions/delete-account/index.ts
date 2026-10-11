// delete-account : supprime pour de vrai le compte de la personne connectée (lot 9b, 11/10/2026).
//
// Auth : verify_jwt = true ; la personne ne peut supprimer que SON compte (user.id du jeton).
// { confirm: false } rend l'aperçu ; { confirm: true } exécute le même plan (deletion-plan.ts).
// Ordre : héritiers → enseignes supprimées (Stripe, fichiers, ligne actors) → fichiers de la
// personne → ligne actors de la personne (cascade) → connexion. Chaque étape se rejoue sans
// planter sur ce qui a déjà disparu.
// Spec : docs/superpowers/specs/2026-10-11-lot-9b-reglages-v2-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { deletionPlan, inChunks, shouldCancel, type Membership } from './deletion-plan.ts'

const PAGE = 1000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)
  const body = (await req.json().catch(() => ({}))) as { confirm?: unknown }
  // Seul un vrai `true` supprime : « "false" » ou « 1 » ne rendent que l'aperçu.
  const confirm = body.confirm === true

  const admin = getSupabaseAdmin()
  let step = 'read'
  try {
    const { memberships, entities } = await readMemberships(admin, user.id)
    const plan = deletionPlan(user.id, memberships)
    const subscribed = (id: string) => {
      const entity = entities.get(id)
      return Boolean(entity?.stripe_subscription_id && shouldCancel(entity.subscription_status ?? ''))
    }

    if (!confirm) {
      return json({
        deleted: plan.deleted.map((e) => ({ ...e, subscribed: subscribed(e.entityActorId) })),
        kept: plan.kept.map(({ entityActorId, brandName }) => ({ entityActorId, brandName })),
      })
    }

    step = 'heirs'
    for (const entity of plan.kept) {
      if (!entity.heirActorId) continue
      await must(admin.from('memberships').update({ role: 'owner' })
        .eq('entity_actor_id', entity.entityActorId).eq('user_actor_id', entity.heirActorId))
    }

    for (const { entityActorId } of plan.deleted) {
      step = `entity:${entityActorId}`
      const subscriptionId = entities.get(entityActorId)?.stripe_subscription_id
      if (subscriptionId) await cancelSubscription(subscriptionId)
      await removeFolder(admin, 'entity-gallery', entityActorId)
      await removeFolder(admin, 'bilan-media', entityActorId)
      await must(admin.from('actors').delete().eq('id', entityActorId))
    }

    step = 'files'
    await removeFolder(admin, 'avatars', user.id)
    await removeFolder(admin, 'bilan-media', user.id)

    step = 'person'
    await must(admin.from('actors').delete().eq('id', user.id))

    step = 'auth'
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error && error.status !== 404) throw error

    return json({ done: true })
  } catch (err) {
    console.error('[delete-account]', step, err)
    return json({ error: 'failed', step }, 500)
  }
})

async function readMemberships(admin: ReturnType<typeof getSupabaseAdmin>, personId: string) {
  const { data: mine, error } = await admin.from('memberships').select('entity_actor_id')
    .eq('user_actor_id', personId)
  if (error) throw error
  const ids = (mine ?? []).map((row) => row.entity_actor_id as string)
  if (ids.length === 0) return { memberships: [] as Membership[], entities: new Map() }
  const [all, rows] = await Promise.all([
    admin.from('memberships').select('user_actor_id, entity_actor_id, role, created_at')
      .in('entity_actor_id', ids).order('created_at'),
    admin.from('entities').select('actor_id, brand_name, stripe_subscription_id, subscription_status')
      .in('actor_id', ids),
  ])
  if (all.error) throw all.error
  if (rows.error) throw rows.error
  const entities = new Map(rows.data.map((row) => [row.actor_id as string, row]))
  const memberships: Membership[] = all.data.map((row) => ({
    userActorId: row.user_actor_id,
    entityActorId: row.entity_actor_id,
    role: row.role,
    createdAt: row.created_at,
    brandName: entities.get(row.entity_actor_id)?.brand_name ?? '',
  }))
  return { memberships, entities }
}

/** Résilie l'abonnement Stripe d'après son état chez Stripe (pas d'après la base, que le webhook
 *  met à jour plus tard) : un abonnement déjà terminé ou disparu ne bloque pas un nouvel essai. */
async function cancelSubscription(subscriptionId: string) {
  const stripe = getStripe()
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (shouldCancel(subscription.status)) await stripe.subscriptions.cancel(subscriptionId)
  } catch (err) {
    if ((err as { code?: string }).code !== 'resource_missing') throw err
  }
}

/** Efface tout un dossier d'un bucket, sous-dossiers compris, page par page et par paquets de
 *  1000. Un dossier absent ne gêne pas. */
async function removeFolder(admin: ReturnType<typeof getSupabaseAdmin>, bucket: string, prefix: string) {
  const paths: string[] = []
  const queue = [prefix]
  while (queue.length > 0) {
    const folder = queue.shift()!
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await admin.storage.from(bucket).list(folder, { limit: PAGE, offset })
      if (error) throw error
      for (const item of data ?? []) {
        const path = `${folder}/${item.name}`
        if (item.id === null) queue.push(path)
        else paths.push(path)
      }
      if ((data ?? []).length < PAGE) break
    }
  }
  for (const chunk of inChunks(paths, PAGE)) {
    const { error } = await admin.storage.from(bucket).remove(chunk)
    if (error) throw error
  }
}

async function must<T extends { error: unknown }>(query: PromiseLike<T>) {
  const { error } = await query
  if (error) throw error
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
