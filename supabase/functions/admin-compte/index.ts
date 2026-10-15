// admin-compte : suspendre, réactiver ou changer l'e-mail de connexion d'un compte (administration V2).
// Auth : verify_jwt = true, puis is_admin() — sinon 403. Jamais sur soi-même (400 self).
// Suspendre = bannir chez Supabase (plus de connexion) + dater users.suspended_at ; le contenu reste.
// Spec : docs/superpowers/specs/2026-10-15-v2-admin-lot-2-comptes-design.md.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

type Body =
  | { action: 'suspendre' | 'reactiver'; userId: string }
  | { action: 'email'; userId: string; email: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (isAdmin !== true) return json({ error: 'forbidden' }, 403)

  const body = parseBody(await req.json().catch(() => null))
  if (!body) return json({ error: 'invalid_body' }, 400)
  if (body.userId === user.id) return json({ error: 'self' }, 400)

  const admin = getSupabaseAdmin()
  try {
    if (body.action !== 'email') {
      const suspend = body.action === 'suspendre'
      const { error } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: suspend ? '876000h' : 'none' })
      if (error) throw error
      const { error: dbError } = await admin.from('users')
        .update({ suspended_at: suspend ? new Date().toISOString() : null }).eq('actor_id', body.userId)
      if (dbError) throw dbError
      return json({ done: true })
    }

    const email = body.email.trim().toLowerCase()
    if (!EMAIL.test(email)) return json({ error: 'invalid_email' }, 400)
    const { error } = await admin.auth.admin.updateUserById(body.userId, { email, email_confirm: true })
    if (error) {
      const taken = error.code === 'email_exists' || /already/i.test(error.message)
      if (!taken) throw error
      return json({ error: 'email_taken' }, 409)
    }
    const { error: dbError } = await admin.from('users').update({ email }).eq('actor_id', body.userId)
    if (dbError) throw dbError
    return json({ done: true })
  } catch (err) {
    console.error('[admin-compte]', err)
    return json({ error: 'failed' }, 500)
  }
})

function filled(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function parseBody(raw: unknown): Body | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { action, userId, email } = raw as Record<string, unknown>
  if (!filled(userId)) return null
  if (action === 'suspendre' || action === 'reactiver') return { action, userId }
  if (action === 'email' && filled(email)) return { action, userId, email }
  return null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
